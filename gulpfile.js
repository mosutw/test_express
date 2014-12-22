var gulp = require('gulp'),
    livereload = require('gulp-livereload');

gulp.task('watch', function(){
  var server = livereload();

  gulp.watch('*.*',function(file) {
    server.changed(file.path);
  });
});
