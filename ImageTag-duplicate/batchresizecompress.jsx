#target photoshop
app.displayDialogs = DialogModes.NO;

(function () {

  // ====== SETTINGS ======
  var MAX_WIDTH  = 2000;     // pixels
  var MAX_HEIGHT = 2000;     // pixels
  var JPEG_QUALITY = 8;      // 0–12 (higher = better quality, bigger file)
  var CONVERT_TO_SRGB = true; // set false to keep original profile
  var STRIP_METADATA = false; // Photoshop doesn't fully "strip", but can reduce some via Save for Web alternative (not used here)

  // ====== PICK FOLDERS ======
  var inFolder = Folder.selectDialog("Select the INPUT folder of images");
  if (!inFolder) return;

  var outFolder = Folder.selectDialog("Select the OUTPUT folder");
  if (!outFolder) return;

  // ====== FILE TYPES ======
  var files = inFolder.getFiles(function (f) {
    if (f instanceof Folder) return false;
    return /\.(jpg|jpeg|png|tif|tiff|psd)$/i.test(f.name);
  });

  if (!files.length) {
    alert("No supported image files found in the selected folder.");
    return;
  }

  // ====== MAIN LOOP ======
  for (var i = 0; i < files.length; i++) {
    try {
      var file = files[i];
      var doc = app.open(file);

      // Optional: convert to sRGB
      if (CONVERT_TO_SRGB) {
        try {
          doc.convertProfile("sRGB IEC61966-2.1", Intent.RELATIVECOLORIMETRIC, true, true);
        } catch (e1) {
          // some docs may fail conversion; ignore and continue
        }
      }

      // Flatten to avoid saving issues with some formats (optional)
      if (doc.layers.length > 1) {
        doc.flatten();
      }

      // Resize to fit bounding box
      resizeToFit(doc, MAX_WIDTH, MAX_HEIGHT);

      // Save as JPEG
      var outName = stripExtension(file.name) + ".jpg";
      var outFile = new File(outFolder.fsName + "/" + outName);

      var jpegOptions = new JPEGSaveOptions();
      jpegOptions.quality = JPEG_QUALITY;
      jpegOptions.embedColorProfile = CONVERT_TO_SRGB; // embed sRGB profile if converted
      jpegOptions.formatOptions = FormatOptions.STANDARDBASELINE;
      jpegOptions.matte = MatteType.NONE;

      doc.saveAs(outFile, jpegOptions, true, Extension.LOWERCASE);

      // Close without saving changes to original
      doc.close(SaveOptions.DONOTSAVECHANGES);

    } catch (err) {
      // If something fails, try to close open doc safely and continue
      try { app.activeDocument.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) {}
      $.writeln("Error processing " + files[i].name + ": " + err);
    }
  }

  alert("Done! Processed " + files.length + " files.");

  // ====== HELPERS ======
  function resizeToFit(doc, maxW, maxH) {
    var w = doc.width.as("px");
    var h = doc.height.as("px");

    // Only shrink (don’t upscale)
    if (w <= maxW && h <= maxH) return;

    var ratioW = maxW / w;
    var ratioH = maxH / h;
    var ratio = Math.min(ratioW, ratioH);

    var newW = Math.round(w * ratio);
    var newH = Math.round(h * ratio);

    doc.resizeImage(UnitValue(newW, "px"), UnitValue(newH, "px"), null, ResampleMethod.BICUBICSHARPER);
  }

  function stripExtension(filename) {
    return filename.replace(/\.[^\.]+$/, "");
  }

})();