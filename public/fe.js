$("document").ready(function(){
  $('#showFiles').click(function(){
    $.getJSON('/api/files', function(obj){
      var r = '';
      $.each(obj.files, function(k,v){
        r += v + "<br>";
      });
      $('#myiframe').contents().find('body').html(r);
    });  
  });
  
  $('#deleteFiles').click(function(){
    if(window.confirm('Delete all files?')) {
      $.getJSON('/api/del-files', function(obj){
        var r = '';
        $.each(obj.deletedFiles, function(k,v){
          r += v + "<br>";
        });
        $('#myiframe').contents().find('body').html(r);
      }); 
    }
  });
});

