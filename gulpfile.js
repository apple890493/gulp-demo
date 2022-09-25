const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require('autoprefixer');
const $plug = require('gulp-load-plugins')();
const mainBowerFiles = require('main-bower-files');
const browserSync = require('browser-sync').create();
const cleanCSS = require('gulp-clean-css');
const minimist = require('minimist');
// const gulpSequence = require('gulp-sequence'); //4.0 不需要靠套件就能夠選擇是否依序執行

// const sourcemaps = require('gulp-sourcemaps');
// const concat = require('gulp-concat');
// const babel = require('gulp-babel');
// const jade = require('gulp-jade');
// const plumber = require('gulp-plumber'); //讓編譯發生錯誤時不會中止程式碼
// const postcss = require('gulp-postcss');

const envOptions = {
  string: 'env',
  default: { env: 'develop' }
}

const options = minimist((process.argv.slice(2)), envOptions);

gulp.task('clean', function () {
  return gulp.src(['./.tmp', './public'], { read: false, allowEmpty: true })
    .pipe($plug.clean());
});

gulp.task('copyJade', async function () {
  // var YOUR_LOCALS = {};

  gulp.src('./source/**/*.jade')
    .pipe($plug.plumber())
    .pipe($plug.jade({
      pretty: true
    }))
    .pipe(gulp.dest('./public/'))
    .pipe(browserSync.stream())
});

gulp.task('buildSass', function () {
  return gulp.src('./source/**/*.scss')
    .pipe($plug.plumber())
    .pipe($plug.sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    //編譯完成
    .pipe($plug.postcss([autoprefixer()]))
    .pipe($plug.if(options.env === 'prod', cleanCSS({ compatibility: 'ie8' })))
    .pipe($plug.sourcemaps.write('.'))
    .pipe(gulp.dest('./public/css'))
    .pipe(browserSync.stream())
});

gulp.task('babel', () =>
  gulp.src('./source/js/**/*.js')
    .pipe($plug.sourcemaps.init())
    .pipe($plug.babel({
      presets: ['es2015'] //環境2015才能使uglify()正確執行
    }))
    .pipe($plug.concat('all.js')) //減少外部要取得的檔案數量
    .pipe($plug.if(options.env === 'prod', $plug.uglify({
      compress: {
        drop_console: true
      }
    })))
    .pipe($plug.sourcemaps.write('.'))
    .pipe(gulp.dest('./public/js'))
    .pipe(browserSync.stream())
);

gulp.task('bower', function () {
  return gulp.src(mainBowerFiles())
    .pipe(gulp.dest('./.tmp/vendors'))
});

gulp.task('vendorJs', function () {
  return gulp.src('./.tmp/vendors/**/*.js')
    /* help to order if the package depend on each other, Ex: */
    .pipe($plug.order([
      'jquery.js',
      'bootstrap.js'
    ]))
    .pipe($plug.concat('vendors.js'))
    .pipe($plug.if(options.env === 'prod', $plug.uglify()))
    .pipe(gulp.dest('./public/js'))
});

gulp.task('browser-sync', function () {
  return browserSync.init({
    server: {
      baseDir: "./public/"
    },
    reloadDebounce: 2000
  });
});

/* 壓縮圖片通常很花費時間，通常develop階段不會將它排進流程中，在production 才會需要 */
gulp.task('image-min', function () {
  gulp.src('src/images/*')
    .pipe($plug.if(options.env === 'prod', $plug.imagemin()))
    .pipe(gulp.dest('./public/images'))
});

gulp.task('watchFile', function () {
  gulp.watch('./source/scss/**/*.scss', gulp.series('buildSass'));
  gulp.watch('./source/**/*.jade', gulp.series('copyJade'));
  gulp.watch('./source/js/**/*.js', gulp.series('babel'));
});

gulp.task('build', gulp.series('clean', 'copyJade', 'buildSass', 'babel', 'bower', 'vendorJs', 'image-min'));

gulp.task('default', gulp.series('copyJade', 'buildSass', 'babel', 'bower', 'vendorJs', gulp.parallel('browser-sync', 'watchFile')));

/*
gulp.parallel() execute in the same time;
in this case, browserSync should trigger with watchFile.
gulp.series() execute by order.
*/

