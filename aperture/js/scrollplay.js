$(document).ready(function () {
    var $myVideo = $('#myVideo');

    function playPause() {
        if ($myVideo.get(0).paused) {
            $myVideo.get(0).play();
        } else {
            $myVideo.get(0).pause();
        }
    }

    // Optional: Bind the function to a button click
    $('#playPauseButton').click(function () {
        playPause();
    });
});