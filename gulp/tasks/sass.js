import gulp from 'gulp';
import gulpif from 'gulp-if';
import sass from 'gulp-sass';
import sassGlob from 'gulp-sass-glob';
import sourcemaps from 'gulp-sourcemaps';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
// import mqpacker from 'css-mqpacker';
import config from '../config';
import csso from 'postcss-csso';
import plumber from 'gulp-plumber';


const isMax = mq => /max-width/.test(mq);
const isMin = mq => /min-width/.test(mq);

const sortMediaQueries = (a, b) => {
  A = a.replace(/\D/g, '');
  B = b.replace(/\D/g, '');

  if (isMax(a) && isMax(b)) {
    return B - A;
  } else if (isMin(a) && isMin(b)) {
    return A - B;
  } else if (isMax(a) && isMin(b)) {
    return 1;
  } else if (isMin(a) && isMax(b)) {
    return -1;
  }
  return 1;
}

const processors = [
  autoprefixer({
    overrideBrowserslist: ['last 2 versions'],
    cascade: true
  }),
  // require('lost'),
  // mqpacker({
  //   sort: sortMediaQueries
  // }),
  csso
];

gulp.task('sass', () => gulp
  .src(config.src.sass + '/*.{sass,scss}')
  .pipe(gulpif(config.production === false, sourcemaps.init()))
  .pipe(plumber({
    errorHandler: config.errorHandler
  }))
  .pipe(sassGlob())
  .pipe(sass({
    outputStyle: config.production ? 'compressed' : 'nested', // nested, expanded, compact, compressed
    precision: 5
  }))
  .pipe(postcss(processors))
  .pipe(gulpif(config.production === false, sourcemaps.write('./')))
  .pipe(gulp.dest(config.dest.css))
);

const build = gulp => gulp.parallel('sass');
const watch = gulp => () => gulp.watch(config.src.sass + '/**/*.{sass,scss}', gulp.parallel('sass'));

module.exports.build = build;
module.exports.watch = watch;
