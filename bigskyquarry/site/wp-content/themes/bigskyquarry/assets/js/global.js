;
(function ($) {

    /*
    let responsiveSliderSettings = {
        rows: 0,
        slidesToShow: 2,
        dots: true,
    };
    let $responsiveSlider = $('.selector');
     */

    // Scripts which runs after DOM load
    let scrollOut;
    $(function () {

        // Init LazyLoad
        let lazyLoadInstance = new LazyLoad({
            elements_selector: 'img[data-lazy-src],.pre-lazyload,[data-pre-lazyload],video:not([src]):not([data-lazy-src]),video[data-lazy-src]',
            data_src: "lazy-src",
            data_srcset: "lazy-srcset",
            data_sizes: "lazy-sizes",
            skip_invisible: false,
            class_loading: "lazyloading",
            class_loaded: "lazyloaded",
        });
        // Add tracking on adding any new nodes to body to update lazyload for the new images (AJAX for example)
        window.addEventListener('LazyLoad::Initialized', function (e) {
            // Get the instance and puts it in the lazyLoadInstance variable
            if (window.MutationObserver) {
                let observer = new MutationObserver(function (mutations) {
                    mutations.forEach(function (mutation) {
                        mutation.addedNodes.forEach(function (node) {
                            if (typeof node.getElementsByTagName !== 'function') {
                                return;
                            }
                            let imgs = node.getElementsByTagName('img');
                            if (0 === imgs.length) {
                                return;
                            }
                            lazyLoadInstance.update();
                        });
                    });
                });
                let b = document.getElementsByTagName("body")[0];
                let config = {childList: true, subtree: true};
                observer.observe(b, config);
            }
        }, false);

        // Load all images in slider after init
        $(document).on("init", ".slick-slider", function (e, slick) {
            lazyLoadInstance.loadAll(slick.$slider[0].getElementsByTagName('img'));
        });

        /*
        // responsiveSliderSettings - Settings for slider on responsive. Create this variable in the top of this file before $(document).ready()
        reinitSlickOnResize($responsiveSlider, responsiveSliderSettings, 641)
         */

        // Detect element appearance in viewport
        if (typeof ScrollOut !== 'undefined') {
            scrollOut = ScrollOut({
                offset: function (el) {
                    let bodyRect = document.body.getBoundingClientRect();
                    let rect = el.getBoundingClientRect();
                    let offset = rect.top - bodyRect.top - window.innerHeight;
                    return offset + 50;
                },
                targets: '.acf-map,[data-scroll]',
                once: true,
                onShown: function (element) {
                    if ($(element).is('.ease-order')) {
                        $(element).find('.ease-order__item').each(function (i) {
                            let $this = $(this);
                            $(this).attr('data-scroll', '');
                            window.setTimeout(function () {
                                $this.attr('data-scroll', 'in');
                            }, 300 * i);
                        });
                    }
                    if ($(element).is('.acf-map')) {
                        render_map($(element));
                    }
                }
            });
        }

        // Init parallax
        if (typeof $.fn.jarallax !== 'undefined') {
            $('.jarallax').jarallax({
                speed: 0.5,
            });

            $('.jarallax-inline').jarallax({
                speed: 0.5,
                keepImg: true,
                onInit: function () {
                    lazyLoadInstance.update();
                }
            });
        }

        //Remove placeholder on click
        $('input, textarea').each(function () {
            removeInputPlaceholderOnFocus(this);
        });

        //Make elements equal height
        if (typeof $.fn.matchHeight !== 'undefined') {
            $('.matchHeight').matchHeight();
        }

        // Add fancybox to images
        // $('.gallery-item').find('a[href$="jpg"], a[href$="png"], a[href$="gif"]').attr('rel', 'gallery').attr('data-fancybox', 'gallery');
        // $('a[rel*="album"], .fancybox, a[href$="jpg"], a[href$="png"], a[href$="gif"]').fancybox({});
        //-------------------
        //--------------
        $('[data-fancybox]').fancybox({
            loop: true,
            buttons: [
                'close'
            ],
            youtube: {
                controls: 1,
                showinfo: 0
            },
            vimeo: {
                color: 'f00'
            }
        });


        /**
         * Scroll to Gravity Form confirmation message after form submit
         */
        $(document).on('gform_confirmation_loaded', function (event, formId) {
            let $target = $('#gform_confirmation_wrapper_' + formId);
            var $headerHeight = $(".js-header").outerHeight() || 0;
            var $scrollOffset = 100;
            var $elementScroll;
            if ($target.closest('section.contact-form_top').length) {
                $elementScroll = $target.closest('section.contact-form').offset().top - $headerHeight - $scrollOffset;
            } else if ($target.closest('section.contact-form')) {
                $elementScroll = $target.closest('section.contact-form').offset().top - $headerHeight;
            }

            $('html, body').animate({scrollTop: $elementScroll}, 200);
        });

        // Init Jquery UI select
        $("select").not("#billing_state, #shipping_state, #billing_country, #shipping_country, [class*='woocommerce'], #product_cat, #rating").each(function () {
            initSelect2(this);
        });

        $(document).on('gform_post_render', function (event, form_id, current_page) {
            const $form = $("#gform_" + form_id)
            $form.find("select").each(function () {
                initSelect2(this);
            });

            $form.find("input, textarea").each(function () {
                removeInputPlaceholderOnFocus(this);
            });
        });

        $(document).on('click', '.s-qty-dec,.s-qty-inc', function () {
            let $numberInput = $(this).closest('.quantity').find('input'),
                action = $(this).is('.s-qty-inc') ? 'stepUp' : 'stepDown';
            $numberInput[0][action]();
            $numberInput.trigger('change');
        });

        /**
         * Update lazyload images and reinit select on cart/checkout update
         */
        $(document).on('updated_wc_div', function () {
            lazyLoadInstance.loadAll();
            $('body').find('div.woocommerce').find('select').each(function () {
                initSelect2(this);
            });
        });

        /**
         * Hide gravity forms required field message on data input
         */
        $('body').on('change keyup', '.gfield input, .gfield textarea, .gfield select', function () {
            let $field = $(this).closest('.gfield');
            if ($field.hasClass('gfield_error') && $(this).val().length) {
                $field.find('.validation_message').hide();
            } else if ($field.hasClass('gfield_error') && !$(this).val().length) {
                $field.find('.validation_message').show();
            }
        });

        /**
         * Add `is-active` class to menu-icon button on Responsive menu toggle
         * And remove it on breakpoint change
         */
        $(window).on('toggled.zf.responsiveToggle', function () {
            $('.menu-icon').toggleClass('is-active');
            $('#main-menu').addClass('is-active');
            $('.menu-icon i').each(function () {
                var $icon = $(this);
                if ($icon.closest('.menu-icon').hasClass('is-active')) {
                    $icon.removeClass('fa-regular fa-compass').addClass('fa-solid fa-circle-xmark');
                } else {
                    $icon.removeClass('fa-solid fa-circle-xmark').addClass('fa-regular fa-compass');
                }
            });
        }).on('changed.zf.mediaquery', function (e, value) {
            $('.menu-icon').removeClass('is-active');
            $('#main-menu').removeClass('is-active');
            $('.menu-icon i').removeClass('fa-solid fa-circle-xmark').addClass('fa-regular fa-compass');
        });

        /**
         * Close responsive menu on orientation change
         */
        $(window).on('orientationchange', function () {
            setTimeout(function () {
                if ($('.menu-icon').hasClass('is-active') && window.innerWidth < 641) {
                    $('[data-responsive-toggle="main-menu"]').foundation('toggleMenu')
                }
            }, 200);
        });

        $('.has-dropdown').on('click', function () {
            $(this).find('.submenu-toggle').trigger('click');
        })

        $('header .menu-item').on('click', function () {
            if ($('#main-menu').hasClass('is-active')) {
                $('.menu-icon').trigger('click');
            }
        })

        resizeVideo();

        // Share post popup
        $('.js-share-link').click(function (e) {
            e.preventDefault();
            let wpWidth = $(window).width(), wpHeight = $(window).height();
            window.open($(this).attr('href'), 'Share', "top=" + (wpHeight - 400) / 2 + ",left=" + (wpWidth - 600) / 2 + ",width=600,height=400");
        });

        handleTabsImageStack();
        handleTabsNavigation();
        updateUnderline();
        smoothScrollToAnchors();
        menuScrollAnchor();
        handle_home_design_tabs();
        handle_home_design_filter();
        handle_gallery_tabs();
        handle_init_site_plan_tab_trigger();

    });

    // Scripts which runs after all elements load
    $(window).on('load', function () {

        if (typeof scrollOut !== "undefined") {
            scrollOut.update();
        }

        //jQuery code goes here
        if ($('.preloader').length) {
            $('.preloader').addClass('preloader--hidden');
        }

        headerScroll();
        playVideoBtn();
        loadPosts(1);
        mobilePostsFilter();
        updateTabsContentHeight();

    });

    // Scripts which runs at window resize
    let resizeVideoCallback = debounce(resizeVideo, 200);
    let debouncedMobilePostsFilter = debounce(mobilePostsFilter, 200);
    // let resizeSliderCallback = debounce( reinitSlickOnResize, 200 );
    $(window).on('resize', function () {

        //jQuery code goes here
        resizeVideoCallback();

        debouncedMobilePostsFilter();
        updateUnderline();
        updateTabsContentHeight();

        /*
        resizeSliderCallback( $responsiveSlider, responsiveSliderSettings, 641 );
        */
    });

    // Scripts which runs on scrolling
    $(window).on('scroll', function () {

        //jQuery code goes here
        headerScroll();
        growAnimation();

    });

    /**
     * This function will render a Google Map onto the selected jQuery element
     */
    function render_map($el) {
        let $markers = $el.find('.marker');
        let styles = [
            {
                "featureType": "all",
                "elementType": "all",
                "stylers": [
                    {
                        "hue": "#00ffbc"
                    }
                ]
            },
            {
                "featureType": "administrative.locality",
                "elementType": "geometry",
                "stylers": [
                    {
                        "visibility": "on"
                    }
                ]
            },
            {
                "featureType": "administrative.neighborhood",
                "elementType": "geometry",
                "stylers": [
                    {
                        "visibility": "on"
                    }
                ]
            },
            {
                "featureType": "landscape.man_made",
                "elementType": "geometry",
                "stylers": [
                    {
                        "visibility": "on"
                    }
                ]
            },
            {
                "featureType": "landscape.natural.terrain",
                "elementType": "geometry",
                "stylers": [
                    {
                        "visibility": "on"
                    }
                ]
            },
            {
                "featureType": "poi",
                "elementType": "all",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "poi",
                "elementType": "geometry",
                "stylers": [
                    {
                        "visibility": "on"
                    },
                    {
                        "hue": "#00ff6e"
                    }
                ]
            },
            {
                "featureType": "poi",
                "elementType": "labels",
                "stylers": [
                    {
                        "visibility": "on"
                    }
                ]
            },
            {
                "featureType": "poi",
                "elementType": "labels.text.fill",
                "stylers": [
                    {
                        "color": "#266b46"
                    }
                ]
            },
            {
                "featureType": "poi",
                "elementType": "labels.icon",
                "stylers": [
                    {
                        "visibility": "simplified"
                    },
                    {
                        "weight": "1.21"
                    }
                ]
            },
            {
                "featureType": "poi.business",
                "elementType": "labels.icon",
                "stylers": [
                    {
                        "weight": "0.74"
                    },
                    {
                        "gamma": "1.00"
                    },
                    {
                        "lightness": "0"
                    }
                ]
            },
            {
                "featureType": "poi.park",
                "elementType": "geometry",
                "stylers": [
                    {
                        "visibility": "on"
                    },
                    {
                        "hue": "#00ff4d"
                    },
                    {
                        "saturation": "-42"
                    },
                    {
                        "lightness": "-17"
                    },
                    {
                        "gamma": "2.37"
                    }
                ]
            },
            {
                "featureType": "road",
                "elementType": "all",
                "stylers": [
                    {
                        "saturation": -70
                    }
                ]
            },
            {
                "featureType": "transit",
                "elementType": "geometry",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "transit.line",
                "elementType": "geometry",
                "stylers": [
                    {
                        "visibility": "on"
                    }
                ]
            },
            {
                "featureType": "transit.station",
                "elementType": "geometry",
                "stylers": [
                    {
                        "saturation": "-62"
                    },
                    {
                        "lightness": "-48"
                    },
                    {
                        "gamma": "0.00"
                    }
                ]
            },
            {
                "featureType": "transit.station",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "on"
                    }
                ]
            },
            {
                "featureType": "transit.station",
                "elementType": "labels.text.fill",
                "stylers": [
                    {
                        "visibility": "on"
                    }
                ]
            },
            {
                "featureType": "transit.station",
                "elementType": "labels.text.stroke",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "transit.station",
                "elementType": "labels.icon",
                "stylers": [
                    {
                        "visibility": "on"
                    }
                ]
            },
            {
                "featureType": "water",
                "elementType": "all",
                "stylers": [
                    {
                        "visibility": "simplified"
                    },
                    {
                        "saturation": -60
                    }
                ]
            }
        ];

        let args = {
            zoom: 10,
            center: new google.maps.LatLng(0, 0),
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            // disableDefaultUI: true,
            // scrollwheel: false,
            styles: styles // Uncomment for map styling
        };

        // create map
        let map = new google.maps.Map($el[0], args);

        // add a markers reference
        map.markers = [];

        // add markers
        $markers.each(function () {
            add_marker($(this), map);
        });

        // center map
        center_map(map);

        //Overlay Map
        let mapOverlay = new google.maps.Rectangle({
            bounds: {
                north: 85,
                south: -85,
                east: 180,
                west: -180
            },
            strokeOpacity: 0,
            fillColor: "#786F51",
            fillOpacity: 0.27,
            clickable: false
        });
        mapOverlay.setMap(map);
    }

    /**
     * This function will add a marker to the selected Google Map
     */
    let infowindow;

    function add_marker($marker, map) {
        let latlng = {lat: parseFloat($marker.attr('data-lat')), lng: parseFloat($marker.attr('data-lng'))};
        var locationId = $marker.data('location-id');

        //create marker
        // const markerIcon = (locationId === 'main-marker') ? $marker.attr('data-marker-icon') : '<div><i class="fa-solid fa-location-plus"></i></div>';
        const markerIcon = $marker.attr('data-marker-icon');
        let marker = new google.maps.Marker({
            position: latlng,
            map: map,
            icon: markerIcon,  //uncomment if you need to use custom marker
            clickable: locationId !== 'main-marker',
        });


        marker.setZIndex(google.maps.Marker.MAX_ZINDEX + 1);


        //add marker id
        marker.locationId = locationId;

        // add to array
        map.markers.push(marker);

        // if marker contains HTML, add it to an infoWindow
        if ($.trim($marker.html())) {
            // create info window
            infowindow = new google.maps.InfoWindow();

            // show info window when marker is clicked
            google.maps.event.addListener(marker, 'click', function () {
                // Close previously opened infowindow, fill with new content and open it
                infowindow.close();
                infowindow.setContent($marker.html());
                infowindow.setHeaderContent($marker.attr('data-marker-title'));
                infowindow.open(map, marker);
            });

            google.maps.event.addListener(map, 'click', function () {
                infowindow.close();
            });

            $('.js-location-filter').on('click', function () {
                infowindow.close();
            })
        }

        //Map filter
        $('.js-location-filter').on('click', function () {

            let selectedId = $(this).data('location-id');
            let $allItems = $('.map-filter-item');
            let $thisItem = $(this).closest('.map-filter-item');

            if ($thisItem.hasClass('active')) {
                return;
            }

            $allItems.removeClass('active').find('.js-location-desc').stop(true, true).slideUp(200);
            $thisItem.addClass('active').find('.js-location-desc').stop(true, true).slideDown(200);

            map.markers.forEach(function (marker) {
                marker.setMap(null);
            });

            let bounds = new google.maps.LatLngBounds();
            let visibleMarkers = [];

            map.markers.forEach(function (marker) {
                if (marker.locationId == selectedId || marker.locationId == 'main-marker') {
                    marker.setMap(map);
                    bounds.extend(marker.getPosition());
                    visibleMarkers.push(marker);
                }
            });

            if (visibleMarkers.length > 1) {
                map.fitBounds(bounds);
            } else if (visibleMarkers.length === 1) {
                map.setCenter(visibleMarkers[0].getPosition());
                map.setZoom(15);
            }
        });
    }

    /**
     * This function will center the map, showing all markers attached to this map
     */
    function center_map(map) {
        // vars
        let bounds = new google.maps.LatLngBounds();

        // loop through all markers and create bounds
        $.each(map.markers, function (i, marker) {
            bounds.extend(marker.position);
        });

        // only 1 marker?
        if (map.markers.length == 1) {
            // set center of map
            map.setCenter(bounds.getCenter());
        } else {
            // fit to bounds
            map.fitBounds(bounds);
        }
    }

    /**
     * Helper functions
     */

    function debounce(callback, time) {
        let timeout;

        return function () {
            let context = this;
            let args = arguments;
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(function () {
                timeout = null;
                callback.apply(context, args);
            }, time);
        }
    }

    function handleFirstTab(e) {
        let key = e.key || e.keyCode;
        if (key === 'Tab' || key === '9') {
            $('body').removeClass('no-outline');

            window.removeEventListener('keydown', handleFirstTab);
            window.addEventListener('mousedown', handleMouseDownOnce);
        }
    }

    function handleMouseDownOnce() {
        $('body').addClass('no-outline');

        window.removeEventListener('mousedown', handleMouseDownOnce);
        window.addEventListener('keydown', handleFirstTab);
    }

    window.addEventListener('keydown', handleFirstTab);

    // Fit slide video background to video holder
    function resizeVideo() {
        let $holder = $(".video-holder");
        $holder.each(function () {
            let $that = $(this);
            let ratio = $that.data("ratio") ? $that.data("ratio") : "16:9",
                width = parseFloat(ratio.split(":")[0]),
                height = parseFloat(ratio.split(":")[1]);
            $that.find(".video-holder__media").each(function () {
                if ($that.width() / width > $that.height() / height) {
                    $(this).css({"width": "100%", "height": "auto"});
                } else {
                    $(this).css({"width": $that.height() * width / height, "height": "100%"});
                }
            });
        });
    }

    // Init Select2 plugin
    function initSelect2(elem) {
        let $field = $(elem);
        let $gfield = $field.closest(".gfield");
        let $countryBox = $field.closest('.ginput_address_country,.gfield_time_ampm');
        let args = {}
        if ($countryBox.length) {
            args.dropdownParent = $countryBox;
        } else if ($gfield.length) {
            args.dropdownParent = $gfield;
        }

        $field.select2(args);
    }

    function removeInputPlaceholderOnFocus(el) {
        $(el).data("holder", $(el).attr("placeholder"));

        $(el).on("focusin", function () {
            $(el).attr("placeholder", "");
        });

        $(el).on("focusout", function () {
            $(el).attr("placeholder", $(el).data("holder"));
        });
    }

    /**
     * Init slick slider on smaller screens, And destroy it on desktop
     */
    function reinitSlickOnResize($slider, settings, breakpoint) {
        if (window.innerWidth >= breakpoint) {
            if ($slider.hasClass("slick-initialized")) {
                $slider.slick("unslick");
            }
        } else {
            if (!$slider.hasClass("slick-initialized")) {
                $slider.slick(settings);
            }
        }
    }

    /**
     * Smooth scroll to target
     */
    function smoothScrollTo($target, offset) {
        offset = typeof offset == "undefined" ? 0 : offset;
        $("html, body").animate({
            scrollTop: $target.offset().top - 50 - offset,
        }, 500);
        $target.focus();
        if ($target.is(":focus")) { // Checking if the target was focused
            return false;
        } else {
            $target.attr('tabindex', '-1'); // Adding tabindex for elements not focusable
            $target.focus(); // Set focus again
        }
    }

    //Header scroll
    function headerScroll() {
        var $scroll = $(window).scrollTop();
        if ($scroll >= 50) {
            $(".js-header").addClass("js-header-scroll");
        } else {
            $(".js-header").removeClass('js-header-scroll');
        }
    }

    function playBtnVideoIframe(iframe, command) {
        let commandObj = {
            event: 'command',
            func: `${command}Video`,
            method: `${command}`,
        };

        iframe.on('load', function () {
            this.contentWindow.postMessage(JSON.stringify(commandObj), '*');
        });

        iframe[0].contentWindow.postMessage(JSON.stringify(commandObj), '*');
    }

    //Play/Pause video
    function playVideoBtn() {
        $('.mask-image-content_video').each(function () {
            let $videoCard = $(this);
            let $video = $videoCard.find('video');
            let $iframeWrap = $videoCard.find('.video-holder__media--embed');
            let $iframe = $iframeWrap.find('iframe');
            let $playBtn = $videoCard.find('.js-play-btn');

            let videoAttr = {
                autoplay: 'true',
                preload: 'auto',
                loop: 'true',
                muted: 'true',
            };

            $playBtn.on('click', function (e) {
                e.stopPropagation();

                if (!$(this).is(':visible')) return;

                let isPaused = $(this).hasClass('js-pause-video');

                if ($iframeWrap.length) {
                    playBtnVideoIframe($iframe, isPaused ? 'play' : 'pause');
                } else {
                    $video.attr(videoAttr);
                    isPaused ? $video[0].play() : $video[0].pause();
                }

                $(this).toggleClass('js-pause-video');
            });
        });

    }

    // ajax posts
    function loadPosts(page = 1, category = '') {
        let $section = $('.posts-loop');
        let mainSection = $('.js-posts-wrapper'),
            postsList = mainSection.find('.js-posts-loop'),
            paginationWrap = $('.js-pagination-block'),
            paginationList = $('.js-pagination');

        $.ajax({
            url: ajax.url,
            type: 'POST',
            data: {
                action: 'loadPosts',
                page_number: page,
                category: category
            },
            beforeSend: function () {
                $section.addClass('loading');
                mainSection.addClass('ajax-overlay--active');
            },
            success: function (response) {
                if (response.success) {
                    postsList.html(response.data.posts);
                    paginationList.html(response.data.pagination);

                    if (response.data.max_num_pages > 1) {
                        paginationWrap.show();
                    } else {
                        paginationWrap.hide();
                    }
                }
            },
            complete: function () {
                $section.removeClass('loading');
                mainSection.removeClass('ajax-overlay--active');
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("AJAX error:", textStatus, errorThrown);
            }
        });
    }

    $(document).on('click', '.js-pagination a', function (e) {
        e.preventDefault();

        let page = $(this).attr('href').match(/paged=(\d+)/);
        page = page ? page[1] : 1;
        activePaginationPages = [+page];

        let category = $('.posts-loop__filter-btn.js-active-cat').attr('data-category') || '';
        let $headerHeight = $('.js-header').outerHeight();
        let $categoriesHeight = $('.js-filter-wrap').outerHeight();
        let $scrollPosition = $('.posts-list').offset().top - $headerHeight - $categoriesHeight - 50;
        console.log($categoriesHeight, $headerHeight)

        loadPosts(page, category);

        $('html, body').animate({scrollTop: $scrollPosition}, 500);
    });

    $('.posts-loop__filter-btn').on('click', function () {
        const $btn = $(this);
        $('.posts-loop__filter-btn.js-active-cat').removeClass('js-active-cat');
        $btn.addClass('js-active-cat');
        let category = $btn.data('category') || '';
        activePaginationPages = [1];
        loadPosts(1, category);
    });

    function mobilePostsFilter() {
        let $headingItems = $('.posts-loop__filter-btn');
        let $filterWrap = $('.posts-loop__filter-wrap');
        let $existingSelect = $('#filterSelect');

        let activeCategory = $('.posts-loop__filter-btn.js-active-cat').data('category') || '';

        if ($(window).width() < 1024) {
            if (!$existingSelect.length) {
                let $selectFilter = $('<select id="filterSelect" class="posts-loop__filter-select"></select>');

                $headingItems.each(function () {
                    let category = $(this).data('category') || '';
                    let text = $(this).text();
                    if (category) {
                        let selected = (category == activeCategory) ? ' selected' : '';
                        $selectFilter.append(`<option value="${category}"${selected}>${text}</option>`);
                    }
                });

                $filterWrap.append($selectFilter);

                $selectFilter.select2({
                    minimumResultsForSearch: Infinity,
                    width: '100%'
                });

                $selectFilter.on('change', function () {
                    let category = $(this).val();
                    $('.posts-loop__filter-btn').removeClass('js-active-cat');
                    $('.posts-loop__filter-btn[data-category="' + category + '"]').addClass('js-active-cat');
                    loadPosts(1, category);
                });

                loadPosts(1, activeCategory);
            }

            $headingItems.hide();
            $('#filterSelect').show();

        } else {
            if ($existingSelect.length) {
                activeCategory = $existingSelect.val() || activeCategory;

                if ($.fn.select2 && $existingSelect.data('select2')) {
                    $existingSelect.select2('destroy');
                }
                $existingSelect.remove();
            }

            $headingItems.show();
            $headingItems.removeClass('js-active-cat')
                .filter('[data-category="' + activeCategory + '"]')
                .addClass('js-active-cat');

            loadPosts(1, activeCategory);
        }
    }

    let animationDone = false;

    function growAnimation() {
        if (animationDone) return;

        let $windowWidth = $(window).width();

        if ($windowWidth > 1024) {
            let $growElement = $('.js-grow-animation');
            let $scrollTop = $(window).scrollTop();

            let $docHeight = $(document).height() - $(window).height();
            let $scrollPercent = 10 + ($scrollTop / $docHeight) * 98;
            $growElement.css("height", $scrollPercent + "%");

            if ($scrollPercent >= 98) {
                animationDone = true;
            }
        }
    }

    function handleTabsImageStack() {
        let prevIndex = $('.tabs-panel.is-active').data('tab-index') || null;

        $('#animated-tabs').on('change.zf.tabs', function (event, $target) {

            const panelId = $target.find('a').attr('href');
            const $panel = $(panelId);

            const newIndex = $panel.data('tab-index');

            $('.tabs-section__stacked-image').removeClass('is-active');

            $('.tabs-section__stacked-image[data-tab-index="' + prevIndex + '"]').addClass('is-active');

            prevIndex = newIndex;
        });
    }

    const $tabs = $('#animated-tabs .tabs-title a');

    function handleTabsNavigation() {
        const $playBtn = $('.js-play-btn');
        const $nextBtn = $('.js-next-btn');
        const $prevBtn = $('.js-prev-btn');

        let autoplay = true;
        let interval = null;
        const delay = 4000;
        let isAutoClick = false;

        function goToTab(index) {
            isAutoClick = true;
            $tabs.eq(index).trigger('click');
            isAutoClick = false;
        }

        function getActiveIndex() {
            return $tabs.parent('.is-active').index();
        }

        function goNext() {
            let index = getActiveIndex();
            index = (index + 1) % $tabs.length;
            goToTab(index);
        }

        function goPrev() {
            let index = getActiveIndex();
            index = (index - 1 + $tabs.length) % $tabs.length;
            goToTab(index);
        }

        function startAutoplay() {
            if (!interval) {
                interval = setInterval(goNext, delay);
                autoplay = true;
                $playBtn.removeClass('is-pause').addClass('is-playing');
            }
        }

        function stopAutoplay() {
            clearInterval(interval);
            interval = null;
            autoplay = false;
            $playBtn.removeClass('is-playing').addClass('is-pause');
        }

        $nextBtn.on('click', function () {
            stopAutoplay();
            goNext();
        });

        $prevBtn.on('click', function () {
            stopAutoplay();
            goPrev();
        });

        $playBtn.on('click', function () {
            if (autoplay) {
                stopAutoplay();
            } else {
                goNext();
                startAutoplay();
            }
        });

        $tabs.on('click', function () {
            if (!isAutoClick) {
                stopAutoplay();
            }
        });

        startAutoplay();
    }

    // handle tabs underline animation
    const $underline = $('#animated-tabs .tabs-underline');

    function moveUnderline($active) {
        if ($(window).width() <= 640) {
            $underline.hide();
            return;
        }

        if (!$active || !$active.length) return;

        const tabCenter = $active.position().left + ($active.outerWidth() / 2);
        const left = tabCenter - ($underline.outerWidth() / 2);

        $underline.css({left: left}).show();
    }

    function updateUnderline() {
        const $active = $('#animated-tabs .is-active a');
        moveUnderline($active);
    }

    $tabs.on('click', function () {
        const $this = $(this);
        setTimeout(() => moveUnderline($this), 50);
    });

    // update tabs content height
    const $tabsContent = $('.tabs-content[data-tabs-content="animated-tabs"]');
    const $panels = $tabsContent.find('.tabs-panel');
    const $panelImage = $tabsContent.find('.tabs-section__panel-image').first();

    function updateTabsContentHeight() {
        let maxPanelHeight = 0;
        $panels.each(function () {
            const h = $(this).outerHeight(true);
            if (h > maxPanelHeight) {
                maxPanelHeight = h;
            }
        });

        let imageHeight = 0;
        if ($panelImage.length) {
            imageHeight = $panelImage.outerHeight(true) + 30;
        }

        const finalHeight = Math.max(maxPanelHeight, imageHeight);
        $tabsContent.css('min-height', finalHeight + 'px');
    }

    function smoothScrollToAnchors() {
        $('a[href*="#"]:not(.tabs-section a[href*="#"], .tabs-title-home-design a, .tabs-title-gallery a)').on('click', function (e) {
            let hash = this.hash;

            if (hash && $(hash).length) {
                e.preventDefault();
                let $target = $(hash);

                let $offset = 0
                if (hash === '#contact-form' && $target.hasClass('contact-form_top')) {
                    $offset = 100;
                }

                smoothScrollTo($target, $offset);
            }
        });
    }

    function menuScrollAnchor() {
        $('a[href*="#contact-form"]').on('click', function (e) {
            let hash = this.hash;
            let $target = $(hash);

            if ($target.length && $target.hasClass('contact-form_top')) {
                e.preventDefault();
                smoothScrollTo($target, 100);

                history.pushState(null, null, hash);
            }
        });

        if (window.location.hash === '#contact-form') {
            let $target = $(window.location.hash);
            if ($target.length && $target.hasClass('contact-form_top')) {
                setTimeout(function () {
                    smoothScrollTo($target, 100);
                }, 10);
            }
        }
    }


    // function handle_home_design_tabs() {
    //
    //     $(document).on('click', '.home-design__tabs .tabs-title-home-design a', function (e) {
    //
    //             e.preventDefault();
    //
    //             const $link = $(this);
    //             const target_id = $link.attr('href');
    //             const $home_design = $link.closest('.home-design');
    //
    //             $home_design.find('.tabs-title-home-design').removeClass('is-active');
    //
    //             $link.parent().addClass('is-active');
    //
    //             $home_design.find('[role="tab"]').attr({
    //                 'aria-selected': 'false',
    //                 'tabindex': '-1'
    //             });
    //
    //             $link.attr({
    //                 'aria-selected': 'true',
    //                 'tabindex': '0'
    //             });
    //
    //             $home_design
    //                 .find('.tabs-panel')
    //                 .removeClass('is-active');
    //
    //             $home_design
    //                 .find(target_id)
    //                 .addClass('is-active');
    //
    //         }
    //     );
    //
    // }
    function handle_home_design_tabs() {

        $(document).on('click', '.home-design__tabs .tabs-title-home-design a', function (e) {

                e.preventDefault();

                const $link = $(this);
                const target_id = $link.attr('href');
                const $home_design = $link.closest('.home-design');
                const $tabs = $home_design.find('.tabs-title-home-design');
                const $links = $tabs.find('a');

                $tabs.removeClass('is-active');

                $link.parent().addClass('is-active');

                $links
                    .removeClass('button_dark')
                    .addClass('button_stroke-transparent-brown')
                    .attr({
                        'aria-selected': 'false',
                        'tabindex': '-1'
                    });

                $link
                    .removeClass('button_stroke-transparent-brown')
                    .addClass('button_dark')
                    .attr({
                        'aria-selected': 'true',
                        'tabindex': '0'
                    });

                $home_design
                    .find('.tabs-panel')
                    .removeClass('is-active');

                $home_design
                    .find(target_id)
                    .addClass('is-active');

            }
        );

    }

    function handle_gallery_tabs() {

        $(document).on('click', '.gallery-1__tabs .tabs-title-gallery a', function (e) {

            e.preventDefault();

            const $link = $(this);

            const target_id = $link.attr('href');
            if (!target_id || target_id.charAt(0) !== '#') {
                return;
            }

            const $gallery = $link.closest('.gallery-1');
            if (!$gallery.length) {
                return;
            }

            const $tabs = $gallery.find('.tabs-title-gallery');
            const $links = $tabs.find('a');

            // reset all tabs state
            $tabs.removeClass('is-active');

            $links.removeClass('button_dark').addClass('button_stroke-dark').attr({
                'aria-selected': 'false',
                'tabindex': '-1'
            });

            // activate current tab
            const $parent_li = $link.parent();

            $parent_li.addClass('is-active');

            $link.removeClass('button_stroke-dark').addClass('button_dark').attr({
                'aria-selected': 'true',
                'tabindex': '0'
            });

            // panels
            const $panels = $gallery.find('.tabs-panel');
            const $target = $gallery.find(target_id);

            if (!$target.length || $target.hasClass('is-active')) {
                return;
            }

            const $active_panel = $panels.filter('.is-active');
            const reduce_motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (reduce_motion || !$active_panel.length) {
                $panels.removeClass('is-active').attr('hidden', true).hide();
                $target.addClass('is-active').removeAttr('hidden').show();
                return;
            }

            $panels.stop(true, true);

            $active_panel.fadeOut(180, function () {
                $active_panel.removeClass('is-active').attr('hidden', true);
                $target.hide().addClass('is-active').removeAttr('hidden').fadeIn(220);
            });

        });

    }


    function handle_home_design_filter() {

        $(document).on('click', '[data-house-filter] .filter-house__button', function (e) {

                e.preventDefault();

                const $button = $(this);
                const $home_design = $button.closest('.home-design');

                const $tab_link = $home_design.find(
                    '.tabs-title-home-design a[data-tab-index="0"]'
                );

                if (
                    $tab_link.length &&
                    !$tab_link.parent().hasClass('is-active')
                ) {
                    $tab_link.trigger('click');
                }

                const term_slug = $button.data('filter-home-type');
                const $items = $home_design.find('[data-house-list] .house-list__item');
                const reduce_motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                const $matching_items = $items.filter(function () {
                    const item_types = String($(this).data('home-types') || '').split(/\s+/);

                    return term_slug === 'all' || item_types.indexOf(term_slug) !== -1;
                });

                $items.stop(true, true);

                if (reduce_motion) {
                    $items.hide();
                    $matching_items.show();
                } else {
                    const $visible_items = $items.filter(':visible');

                    $visible_items.fadeTo(180, 0).promise().done(function () {
                        $items.hide().css('opacity', '');

                        $matching_items
                            .css('opacity', 0)
                            .show()
                            .fadeTo(220, 1, function () {
                                $(this).css('opacity', '');
                            });
                    });
                }

                $home_design.find('.filter-house__button').removeClass('is-active').attr('aria-pressed', 'false');
                $button.addClass('is-active').attr('aria-pressed', 'true');
            }
        );

    }

    function handle_init_site_plan_tab_trigger() {

        const $view_tab_button = $('[data-id="view-tab-site-plan"]');
        const $target_tab_button = $('#home-design-3-tab-button-2');

        if (!$view_tab_button.length || !$target_tab_button.length) {
            return;
        }

        $(document).on('click', '[data-id="view-tab-site-plan"]', function () {

            if (!$target_tab_button.length) {
                return;
            }

            $('html, body').animate({
                scrollTop: $target_tab_button.offset().top - 100
            }, 600, function () {
                $target_tab_button.trigger('click');
            });
            // $target_tab_button.trigger('click');
        });
    }


}(jQuery));


