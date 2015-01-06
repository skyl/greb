// http://stackoverflow.com/a/20522307/177293
function Pdf2Text() {
  var self = this;
  this.complete = 0;

  /**
   *
   * @param data ArrayBuffer of the pdf file content
   * @param callbackPageDone To inform the progress each time
   *        when a page is finished. The callback function's input parameters are:
   *        1) number of pages done;
   *        2) total number of pages in file.
   * @param callbackAllDone The input parameter of callback function is
   *        the result of extracted text from pdf file.
   *
   */
  this.pdfToText = function(data, callbackPageDone, callbackAllDone){
    //console.log("CALLED!");
    console.assert(
      data instanceof ArrayBuffer  || typeof data == 'string'
    );
    PDFJS.getDocument(data).then(function(pdf) {
      //console.log("RETURNED!!");
      var total = pdf.numPages;
      //console.log(total);
      //console.log("about to call callbackPageDone");
      callbackPageDone(0, total);
      //console.log("called callbackPageDone");
      var full_text = "";
      for (i = 1; i <= total; i++) {
        pdf.getPage(i).then(function(page) {
          var n = page.pageNumber;
          page.getTextContent().then(function(textContent) {
            //console.log("TEXTCONTENT!");
            //console.log(textContent);
            for (var i = textContent.items.length - 1; i >= 0; i--) {
              full_text += " " + textContent.items[i].str;
            }
            ++self.complete;
            callbackPageDone(self.complete, total);
            //console.log(self.complete);
            //console.log(total);
            //console.log(i);
            if (self.complete == total){
              window.setTimeout(function(){
                //console.log("COMPLETE");
                //console.log(full_text);
                callbackAllDone(full_text);
              }, 1000);
            }
          }); // end  of page.getTextContent().then
        }); // end of page.then
      } // of for
    }); // end getDocument
  }; // end of pdfToText()
}; // end of class