<script>
function cssEngine(rule) {
  var css = document.createElement('style'); // Creates <style></style>
  css.type = 'text/css'; // Specifies the type
  if (css.styleSheet) css.styleSheet.cssText = rule; // Support for IE
  else css.appendChild(document.createTextNode(rule)); // Support for the rest
  document.getElementsByTagName("head")[0].appendChild(css);
}

var rule = '.house-grid-item.template4 .mask .house-detail .hide-price,.house-grid-item.template4 .mask .house-detail .house-price{font:500 5vw/2vh "Michroma",sans-serif !important;height:auto!important;color:#fff;margin:4vh 0!important;}';
rule += '.bg-blk h3{padding: 5vh 0 0 0;font-family: "Michroma", sans-serif !important;font-weight: 300 !important;margin: 5vh auto;}';
rule += '.img-container h2 {font-family: "Michroma", sans-serif !important;font-weight: 300 !important;}';
rule += '.whitebg {background: #fff;}';
rule += '.house-grid-item.standard .house-price {font-family: "Michroma", sans-serif !important;font-weight: 300 !important;}';
rule += '.title {font-family: "Noto Serif", sans-serif !important;}';
rule += '.destinations {display: flex;justify-content: center;align-items: center;margin: 5vh auto;}';
rule += '.flexchild {width: 33.333%;}';
rule += '.parent-1 {display: flex;justify-content: space-between;width: 90vw;}';
rule += '.child-1 {width: 40%;padding: 2vh 5vw;display: flex;flex-direction: column;justify-content: center;}';
rule += '.child-1 p {font-size: 1.2em;width: 80%;}';
rule += '.child-1 a {display: inline-block;padding: 10px 20px;background-color: #000000;color: #ffffff;text-decoration: none;margin: 5vh 0;border-bottom: #ffffff 1px solid !important;width: 70% !important;text-align: center;}';
rule += '.child-2 {width: 60%;display: flex;align-items: center;justify-content:center;}';
rule += '.container {width: 100%;overflow: auto;}';
rule += '.parent {display: flex;flex-wrap: nowrap;justify-content: space-between;width: 100%;margin: auto;overflow: hidden;}';
rule += '.child {position: relative;width: 33.33%;padding-bottom: 56.25%;margin: 0;height: 20vh;}';
rule += '.child video {position: absolute;top: 0;left: 0;width: 100%;height: 100%;object-fit: cover;}';
rule += '.child a {position: absolute;top: 0;left: 0;width: 100%;height: 100%;display: flex;align-items: center;justify-content: center;text-align: center;text-decoration: none;font-family: "Michroma", sans-serif;}';
rule += '.centered-word {font-size: 24px;width: 50%;color: #fff;text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);text-align: center;}';
rule += '.img-container h2 {font-weight: 300 !important;}';
rule += '.whitebg {background: #fff;}';
rule += '.house-grid-item.standard .house-price {font-family: "Michroma", sans-serif !important;font-weight: 300 !important;}';
rule += '.destinations {display: flex;justify-content: center;align-items: center;margin: 5vh auto;}';
rule += '.flexchild {width: 33.333%;}';
rule += '.parent-1 {display: flex;justify-content: space-between;width: 90vw;}';
rule += '.house-grid.standard {margin-left: 0px !important;}';
rule += '.child-1 {width: 40%;padding: 2vh 5vw;display: flex;flex-direction: column;justify-content: center;}';
rule += '.child-1 p {font-size: 1.2em;width: 80%;}';
rule += '.child-1 a {display: inline-block;padding: 10px 20px;background-color: #000000;color: #ffffff;text-decoration: none;margin: 5vh 0;border-bottom: #ffffff 1px solid !important;width: 30%;text-align: center;}';
rule += '.child-2 img {width: 100%;height: auto;margin: 0;}';
rule += '.container {width: 100%;overflow: auto;}';
rule += '.child {position: relative;width: 33.33%;padding-bottom: 56.25%;margin: 0;height: 20vh;}';
rule += '.child video {position: absolute;top: 0;left: 0;width: 100%;height: 100%;object-fit: cover;}';
rule += '.child a {position: absolute;top: 0;left: 0;width: 100%;height: 100%;display: flex;align-items: center;justify-content: center;text-align: center;text-decoration: none;}';
rule += '.overlay {position: absolute;top: 0;left: 0;width: 100%;height: 100%;background-color: #000;opacity: 0.4;}';
rule += '.media-scroll {width: 100%;height: 70vh;overflow-x: auto;overflow-y: hidden;white-space: nowrap;background-color: #000000;padding: 0 5vw 5vh 5vw;}';
rule += '.media-scroll-item {display: inline-block;width: 20vw;height: 75vh;margin: 1vw;position: relative;}';
rule += '.bg-blk h3 {padding: 5vh 0 0 0;font-weight: 300 !important;margin: 5vh auto;}';
rule += '.media-scroll-item:last-child {margin-right: 0;}';
rule += '.media-scroll-item video {width: 100%;height: 100%;object-fit: cover;}';
rule += '.media-scroll-overlay {position: absolute;top: 0;left: 0;width: 100%;height: 100%;background-color: rgba(0, 0, 0, 0.3);display: flex;align-items: center;justify-content: center;}';
rule += '.media-scroll-overlay h4 {color: #fff;font-weight: bold;font-size: 2rem;margin-bottom: 0;}';
rule += '.media-scroll-overlay p {color: #fff;margin-top: 0;}';
rule += '.media-scroll-overlay a {display: inline-block;padding: 10px 20px;background-color: #000000;color: #ffffff;text-decoration: none;margin-top: 1rem;}';

cssEngine(rule);
</script>