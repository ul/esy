'use strict';

var _stringify;

function _load_stringify() {
  return _stringify = _interopRequireDefault(require('babel-runtime/core-js/json/stringify'));
}

var _keys;

function _load_keys() {
  return _keys = _interopRequireDefault(require('babel-runtime/core-js/object/keys'));
}

var _set;

function _load_set() {
  return _set = _interopRequireDefault(require('babel-runtime/core-js/set'));
}

var _slicedToArray2;

function _load_slicedToArray() {
  return _slicedToArray2 = _interopRequireDefault(require('babel-runtime/helpers/slicedToArray'));
}

var _map;

function _load_map() {
  return _map = _interopRequireDefault(require('babel-runtime/core-js/map'));
}

var _extends2;

function _load_extends() {
  return _extends2 = _interopRequireDefault(require('babel-runtime/helpers/extends'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var _promise;

function _load_promise() {
  return _promise = _interopRequireDefault(require('babel-runtime/core-js/promise'));
}

let resolveToRealpath = (() => {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (packageName, baseDirectory) {
    const resolution = yield resolve(packageName, baseDirectory);
    return (_fs || _load_fs()).realpath(resolution);
  });

  return function resolveToRealpath(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

/**
 * Represents sandbox state.
 *
 * Sandbox declaration:
 *
 *    {
 *      env: env,
 *      packageInfo: packageInfo
 *    }
 *
 * Environment override:
 *
 *    {
 *      env: env {
 *        esy__target_architecture: 'arm'
 *      },
 *      packageInfo: packageInfo
 *    }
 *
 */


/**
 * Sandbox build environment is a set of k-v pairs.
 */


let fromDirectory = (() => {
  var _ref2 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (directory) {
    const source = path.resolve(directory);
    const env = getEnvironment();
    const looseEnv = (0, (_extends2 || _load_extends()).default)({}, env);
    delete looseEnv.PATH;
    delete looseEnv.SHELL;
    const packageJson = yield readPackageJson(path.join(directory, 'package.json'));
    const depSpecList = objectToDependencySpecList(packageJson.dependencies, packageJson.peerDependencies);

    if (depSpecList.length > 0) {
      let resolveWithCache = (() => {
        var _ref3 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (packageName, baseDir) {
          let key = `${baseDir}__${packageName}`;
          let resolution = resolveCache.get(key);
          if (resolution == null) {
            resolution = resolveToRealpath(packageName, baseDir);
            resolveCache.set(key, resolution);
          }
          return resolution;
        });

        return function resolveWithCache(_x4, _x5) {
          return _ref3.apply(this, arguments);
        };
      })();

      let buildPackageInfoWithCache = (() => {
        var _ref4 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (baseDirectory, context) {
          let packageInfo = packageInfoCache.get(baseDirectory);
          if (packageInfo == null) {
            packageInfo = buildPackageInfo(baseDirectory, context);
            packageInfoCache.set(baseDirectory, packageInfo);
          }
          return packageInfo;
        });

        return function buildPackageInfoWithCache(_x6, _x7) {
          return _ref4.apply(this, arguments);
        };
      })();

      const resolveCache = new (_map || _load_map()).default();

      const packageInfoCache = new (_map || _load_map()).default();

      var _ref5 = yield buildDependencyTree(source, depSpecList, {
        resolve: resolveWithCache,
        buildPackageInfo: buildPackageInfoWithCache,
        packageDependencyTrace: [packageJson.name]
      }),
          _ref6 = (0, (_slicedToArray2 || _load_slicedToArray()).default)(_ref5, 2);

      const dependencyTree = _ref6[0],
            errors = _ref6[1];


      return {
        env: env,
        looseEnv: looseEnv,
        packageInfo: {
          source: `local:${yield (_fs || _load_fs()).realpath(source)}`,
          sourceType: 'local',
          normalizedName: normalizeName(packageJson.name),
          rootDirectory: source,
          packageJson: packageJson,
          dependencyTree: dependencyTree,
          errors: errors
        }
      };
    } else {
      return {
        env: env,
        looseEnv: looseEnv,
        packageInfo: {
          source: `local:${yield (_fs || _load_fs()).realpath(source)}`,
          sourceType: 'local',
          normalizedName: normalizeName(packageJson.name),
          rootDirectory: source,
          packageJson: packageJson,
          dependencyTree: {},
          errors: []
        }
      };
    }
  });

  return function fromDirectory(_x3) {
    return _ref2.apply(this, arguments);
  };
})();

/**
 * Traverse package dependency tree.
 */


let buildDependencyTree = (() => {
  var _ref7 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (baseDir, dependencySpecList, context) {
    let dependencyTree = {};
    let errors = [];
    let missingPackages = [];

    for (let dependencySpec of dependencySpecList) {
      var _parseDependencySpec = parseDependencySpec(dependencySpec);

      const name = _parseDependencySpec.name;


      if (context.packageDependencyTrace.indexOf(name) > -1) {
        errors.push({
          message: formatCircularDependenciesError(name, context)
        });
        continue;
      }

      let dependencyPackageJsonPath = '/does/not/exists';
      try {
        dependencyPackageJsonPath = yield context.resolve(`${name}/package.json`, baseDir);
      } catch (_err) {
        missingPackages.push(name);
        continue;
      }

      const packageInfo = yield context.buildPackageInfo(dependencyPackageJsonPath, context);

      errors = errors.concat(packageInfo.errors);
      dependencyTree[name] = packageInfo;
    }

    if (missingPackages.length > 0) {
      errors.push({
        message: formatMissingPackagesError(missingPackages, context)
      });
    }

    return [dependencyTree, errors];
  });

  return function buildDependencyTree(_x9, _x10, _x11) {
    return _ref7.apply(this, arguments);
  };
})();

let buildPackageInfo = (() => {
  var _ref8 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (baseDirectory, context) {
    const dependencyBaseDir = path.dirname(baseDirectory);
    const packageJson = yield readPackageJson(baseDirectory);

    var _ref9 = yield buildDependencyTree(dependencyBaseDir, objectToDependencySpecList(packageJson.dependencies, packageJson.peerDependencies), (0, (_extends2 || _load_extends()).default)({}, context, {
      packageDependencyTrace: context.packageDependencyTrace.concat(packageJson.name)
    })),
        _ref10 = (0, (_slicedToArray2 || _load_slicedToArray()).default)(_ref9, 2);

    const packageDependencyTree = _ref10[0],
          packageErrors = _ref10[1];

    return {
      errors: packageErrors,
      version: packageJson.version,
      source: packageJson._resolved || `local:${yield (_fs || _load_fs()).realpath(dependencyBaseDir)}`,
      sourceType: packageJson._resolved ? 'remote' : 'local',
      rootDirectory: dependencyBaseDir,
      packageJson: packageJson,
      normalizedName: normalizeName(packageJson.name),
      dependencyTree: packageDependencyTree
    };
  });

  return function buildPackageInfo(_x12, _x13) {
    return _ref8.apply(this, arguments);
  };
})();

let readJson = (() => {
  var _ref11 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (filename) {
    const data = yield (_fs || _load_fs()).readFile(filename, 'utf8');
    return JSON.parse(data);
  });

  return function readJson(_x14) {
    return _ref11.apply(this, arguments);
  };
})();

let readPackageJson = (() => {
  var _ref12 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (filename) {
    const packageJson = yield readJson(filename);
    if (packageJson.esy == null) {
      packageJson.esy = {
        build: null,
        exportedEnv: {},
        buildsInSource: false
      };
    }
    if (packageJson.esy.build == null) {
      packageJson.esy.build = null;
    }
    if (packageJson.esy.exportedEnv == null) {
      packageJson.esy.exportedEnv = {};
    }
    if (packageJson.esy.buildsInSource == null) {
      packageJson.esy.buildsInSource = false;
    }
    return packageJson;
  });

  return function readPackageJson(_x15) {
    return _ref12.apply(this, arguments);
  };
})();

var _fs;

function _load_fs() {
  return _fs = _interopRequireWildcard(require('../util/fs'));
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const crypto = require('crypto');
const path = require('path');
const outdent = require('outdent');
const resolveBase = require('resolve');

var _require = require('./Utility');

const mapObject = _require.mapObject;


function resolve(packageName, baseDirectory) {
  return new (_promise || _load_promise()).default((resolve, reject) => {
    resolveBase(packageName, { basedir: baseDirectory }, (err, resolution) => {
      if (err) {
        reject(err);
      } else {
        resolve(resolution);
      }
    });
  });
}

function traversePackageDependencyTree(packageInfo, handler) {
  let seen = new (_set || _load_set()).default();
  traversePackageDependencyTreeImpl(packageInfo, seen, handler);
}

function traversePackageDependencyTreeImpl(packageInfo, seen, handler) {
  let dependencyTree = packageInfo.dependencyTree;

  for (let dependencyName in dependencyTree) {
    if (seen.has(dependencyName)) {
      continue;
    }
    seen.add(dependencyName);
    traversePackageDependencyTreeImpl(dependencyTree[dependencyName], seen, handler);
  }
  handler(packageInfo);
}

function collectTransitiveDependencies(packageInfo) {
  let seen = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new (_set || _load_set()).default();

  let packageJson = packageInfo.packageJson;
  let dependencies = (0, (_keys || _load_keys()).default)(packageInfo.dependencyTree);
  let result = [];
  for (let depName of dependencies) {
    let dep = packageInfo.dependencyTree[depName];
    if (seen.has(depName)) {
      continue;
    }
    seen.add(depName);
    result.push(dep);
    result = result.concat(collectTransitiveDependencies(dep, seen));
  }
  return result;
}

function getEnvironment() {
  let platform = process.env.ESY__TEST ? 'platform' : process.platform;
  let architecture = process.env.ESY__TEST ? 'architecture' : process.arch;
  return {
    'PATH': '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
    'SHELL': 'env -i /bin/bash --norc --noprofile',

    // platform and architecture of the host machine
    'esy__platform': platform,
    'esy__architecture': architecture,

    // platform and architecture of the target machine, so that we can do cross
    // compilation
    'esy__target_platform': platform,
    'esy__target_architecture': architecture
  };
}

function formatMissingPackagesError(missingPackages, context) {
  let packagesToReport = missingPackages.slice(0, 3);
  let packagesMessage = packagesToReport.map(p => `"${p}"`).join(', ');
  let extraPackagesMessage = missingPackages.length > packagesToReport.length ? ` (and ${missingPackages.length - packagesToReport.length} more)` : '';
  return outdent`
    Cannot resolve ${packagesMessage}${extraPackagesMessage} packages
      At ${context.packageDependencyTrace.join(' -> ')}
      Did you forget to run "esy install" command?
  `;
}

function formatCircularDependenciesError(dependency, context) {
  return outdent`
    Circular dependency "${dependency} detected
      At ${context.packageDependencyTrace.join(' -> ')}
  `;
}

function parseDependencySpec(spec) {
  if (spec.startsWith('@')) {
    var _spec$split = spec.split('@', 3),
        _spec$split2 = (0, (_slicedToArray2 || _load_slicedToArray()).default)(_spec$split, 3);

    let _ = _spec$split2[0],
        name = _spec$split2[1],
        versionSpec = _spec$split2[2];

    return { name: '@' + name, versionSpec: versionSpec };
  } else {
    var _spec$split3 = spec.split('@'),
        _spec$split4 = (0, (_slicedToArray2 || _load_slicedToArray()).default)(_spec$split3, 2);

    let name = _spec$split4[0],
        versionSpec = _spec$split4[1];

    return { name: name, versionSpec: versionSpec };
  }
}

function objectToDependencySpecList() {
  let dependencySpecList = [];

  for (var _len = arguments.length, objs = Array(_len), _key = 0; _key < _len; _key++) {
    objs[_key] = arguments[_key];
  }

  for (let obj of objs) {
    if (obj == null) {
      continue;
    }
    for (let name in obj) {
      let versionSpec = obj[name];
      let dependencySpec = `${name}@${versionSpec}`;
      if (dependencySpecList.indexOf(dependencySpec) === -1) {
        dependencySpecList.push(dependencySpec);
      }
    }
  }
  return dependencySpecList;
}

function normalizeName(name) {
  return name.toLowerCase().replace(/@/g, '').replace(/\//g, '_').replace(/\-/g, '_');
}

function packageInfoKey(env, packageInfo) {
  var _packageInfo$packageJ = packageInfo.packageJson;
  let name = _packageInfo$packageJ.name,
      version = _packageInfo$packageJ.version,
      esy = _packageInfo$packageJ.esy,
      normalizedName = packageInfo.normalizedName,
      source = packageInfo.source;

  if (packageInfo.__cachedPackageHash == null) {
    let h = hash({
      env: env,
      source: source,
      packageInfo: {
        packageJson: {
          name: name, version: version, esy: esy
        },
        dependencyTree: mapObject(packageInfo.dependencyTree, dep => packageInfoKey(env, dep))
      }
    });
    if (process.env.ESY__TEST) {
      packageInfo.__cachedPackageHash = `${normalizedName}-${version || '0.0.0'}`;
    } else {
      packageInfo.__cachedPackageHash = `${normalizedName}-${version || '0.0.0'}-${h}`;
    }
  }
  return packageInfo.__cachedPackageHash;
}

function hash(value) {
  if (typeof value === 'object') {
    if (value === null) {
      return hash("null");
    } else if (!Array.isArray(value)) {
      const v = value;
      let keys = (0, (_keys || _load_keys()).default)(v);
      keys.sort();
      return hash(keys.map(k => [k, v[k]]));
    } else {
      return hash((0, (_stringify || _load_stringify()).default)(value.map(hash)));
    }
  } else if (value === undefined) {
    return hash('undefined');
  } else {
    let hasher = crypto.createHash('sha1');
    hasher.update((0, (_stringify || _load_stringify()).default)(value));
    return hasher.digest('hex');
  }
}

module.exports = {
  fromDirectory: fromDirectory,
  traversePackageDependencyTree: traversePackageDependencyTree,
  collectTransitiveDependencies: collectTransitiveDependencies,
  packageInfoKey: packageInfoKey
};