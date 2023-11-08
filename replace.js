document.addEventListener("DOMContentLoaded", function () {
    // This code runs after the page has finished loading

    // Trigger the content replacement here (e.g., after a delay)
    setTimeout(replaceContent, 2000); // Replace content after 2 seconds

    function replaceContent() {
        var url = 'https://k4design.github.io/message.html';
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var externalHTML = xhr.responseText;
                var elementToReplace = document.querySelector('.mg-title');
                elementToReplace.innerHTML = externalHTML;
            }
        };

        xhr.send();
    }
});
