'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify;

function _load_stringify() {
  return _stringify = _interopRequireDefault(require('babel-runtime/core-js/json/stringify'));
}

var _promise;

function _load_promise() {
  return _promise = _interopRequireDefault(require('babel-runtime/core-js/promise'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var _path;

function _load_path() {
  return _path = _interopRequireDefault(require('path'));
}

var _http;

function _load_http() {
  return _http = _interopRequireDefault(require('http'));
}

var _errors;

function _load_errors() {
  return _errors = require('../errors.js');
}

var _opamResolver;

function _load_opamResolver() {
  return _opamResolver = require('../resolvers/exotics/opam-resolver');
}

var _baseFetcher;

function _load_baseFetcher() {
  return _baseFetcher = _interopRequireDefault(require('../fetchers/base-fetcher.js'));
}

var _constants;

function _load_constants() {
  return _constants = _interopRequireWildcard(require('../constants.js'));
}

var _fs;

function _load_fs() {
  return _fs = _interopRequireWildcard(require('../util/fs.js'));
}

var _child;

function _load_child() {
  return _child = _interopRequireWildcard(require('../util/child.js'));
}

var _fs2;

function _load_fs2() {
  return _fs2 = _interopRequireWildcard(require('fs'));
}

var _crypto;

function _load_crypto() {
  return _crypto = _interopRequireWildcard(require('crypto'));
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class OpamFetcher extends (_baseFetcher || _load_baseFetcher()).default {

  _fetch() {
    var _this = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const dest = _this.dest;

      const resolution = (0, (_opamResolver || _load_opamResolver()).parseOpamResolution)(_this.reference);
      const manifest = yield (0, (_opamResolver || _load_opamResolver()).lookupOpamPackageManifest)(resolution.name, resolution.version, _this.config);
      let hash = _this.hash || '';

      if (manifest.opam.url != null) {
        const tarballStorePath = (_path || _load_path()).default.join(dest, (_constants || _load_constants()).TARBALL_FILENAME);
        hash = yield _this._fetchTarball(manifest, tarballStorePath);
        yield unpackTarball(tarballStorePath, dest);
      }

      // opam tarballs don't have package.json (obviously) so we put it there
      yield writeJson((_path || _load_path()).default.join(dest, 'package.json'), manifest);

      // put extra files
      const files = manifest.opam.files;

      if (files) {
        yield (_promise || _load_promise()).default.all(files.map(function (file) {
          return (_fs || _load_fs()).writeFile((_path || _load_path()).default.join(dest, file.name), file.content, 'utf8');
        }));
      }

      // apply patch
      const patch = manifest.opam.patch;

      if (patch) {
        const patchFilename = (_path || _load_path()).default.join(dest, '_esy_patch');
        yield (_fs || _load_fs()).writeFile(patchFilename, patch, 'utf8');
        yield (_child || _load_child()).exec('patch -p1 < _esy_patch', { cwd: dest, shell: '/bin/bash' });
      }

      // TODO: what should we done here?
      const fetchOverride = { hash: hash, resolved: null };
      return fetchOverride;
    })();
  }

  _fetchTarball(manifest, filename) {
    const registry = this.config.registries[this.registry];
    return registry.request(manifest.opam.url, {
      headers: {
        'Accept-Encoding': 'gzip',
        'Accept': 'application/octet-stream'
      },
      buffer: true,
      process: (req, resolve, reject) => {
        const reporter = this.config.reporter;


        const handleRequestError = res => {
          if (res.statusCode >= 400) {
            // $FlowFixMe
            const statusDescription = (_http || _load_http()).default.STATUS_CODES[res.statusCode];
            reject(new Error(reporter.lang('requestFailed', `${res.statusCode} ${statusDescription}`)));
          }
        };

        req.on('response', handleRequestError);
        writeValidatedStream(req, filename, manifest.opam.checksum).then(resolve, reject);
      }
    });
  }

}

exports.default = OpamFetcher;
function writeValidatedStream(stream, filename) {
  let md5checksum = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  const hasher = (_crypto || _load_crypto()).createHash('md5');
  return new (_promise || _load_promise()).default((resolve, reject) => {
    const out = (_fs2 || _load_fs2()).createWriteStream(filename);
    stream.on('data', chunk => {
      if (md5checksum != null) {
        hasher.update(chunk);
      }
    }).pipe(out).on('error', err => {
      reject(err);
    }).on('finish', () => {
      const actualChecksum = hasher.digest('hex');
      if (md5checksum != null) {
        if (actualChecksum !== md5checksum) {
          reject(new (_errors || _load_errors()).SecurityError(`Incorrect md5sum (expected ${md5checksum}, got ${actualChecksum})`));
          return;
        }
      }
      resolve(actualChecksum);
    });
    if (stream.resume) {
      stream.resume();
    }
  });
}

function writeJson(filename, object) {
  const data = (0, (_stringify || _load_stringify()).default)(object, null, 2);
  return (_fs || _load_fs()).writeFile(filename, data, 'utf8');
}

function unpackTarball(filename, dest) {
  return (_child || _load_child()).exec(`tar -xzf ${filename} --strip-components 1 -C ${dest}`);
}