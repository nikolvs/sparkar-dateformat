const Diagnostics = require('Diagnostics');
const Patches = require('Patches');
const Time = require('Time');

/**
 * Global variables.
 */
const globals = {
  interval: null,
};

/**
 * Script options.
 */
const options = {
  /**
   * Default date format.
   */
  format: 'YYYY-MM-DD HH:mm:ss',

  /**
   * Default date refresh interval in seconds.
   */
  refreshInterval: 1,

  /**
   * Display debug info.
   */
  debug: false,
};

/**
 * Display debug messages on console.
 * 
 * @param {String} context
 * @param {String} message
 */
const debug = (context, message) => {
  options.debug && Diagnostics.log(`[debug][${context}] ${message}`);
};

/**
 * Update patch input values.
 */
const update = async () => {
  try {
    const dateString = formatDate(new Date(), options.format);
    await Patches.inputs.setString('date', dateString);
    debug('from script', `date: ${dateString}`);
  } catch (err) {
    Diagnostics.log(err);
  }
};

/**
 * Returns a date/time number in two digits format.
 * 
 * @param {Number} date 
 * @returns {String}
 */
const twoDigit = (date) => String(date).padStart(2, '0');

/**
 * Return hours from date to 12 hours format.
 *
 * @param {Date} date
 * @returns {Number}
 */
const twelveHoursFormat = (date) => (date.getHours() % 12) || 12;

/**
 * Format a date according to the input string.
 * 
 * @param {Date} date 
 * @param {String} format 
 */
const formatDate = (date, format) => {
  return format
    .replace(/(YYYY)/g, date.getFullYear())
    .replace(/(YY)/g, String(date.getFullYear()).slice(-2))
    .replace(/(MM)/g, twoDigit(date.getMonth() + 1))
    .replace(/(M)/g, date.getMonth() + 1)
    .replace(/(DD)/g, twoDigit(date.getDate()))
    .replace(/(D)/g, date.getDate())
    .replace(/(HH)/g, twoDigit(date.getHours()))
    .replace(/(H)/g, date.getHours())
    .replace(/(hh)/g, twoDigit(twelveHoursFormat(date)))
    .replace(/(h)/g, twelveHoursFormat(date))
    .replace(/(mm)/g, twoDigit(date.getMinutes()))
    .replace(/(m)/g, date.getMinutes())
    .replace(/(ss)/g, twoDigit(date.getSeconds()))
    .replace(/(s)/g, date.getSeconds())
    .replace(/(A)/g, date.getHours() >= 12 ? 'PM': 'AM')
    .replace(/(a)/g, date.getHours() >= 12 ? 'pm' : 'am');
};

/**
 * Patch output types mapped to monitor functions names.
 */
const outputTypes = {
  'string': 'getStringOrFallback',
  'number': 'getScalarOrFallback',
  'boolean': 'getBooleanOrFallback',
};

/**
 * Watch a patch output parameter.
 * 
 * @param {String} name 
 * @param {String} type
 * @param {Function} callback
 */
const watchOutput = async (name, type, callback) => {
  const getOutputWatcher = Patches.outputs[outputTypes[type]];
  const watcher = await getOutputWatcher(name, options[name]);

  return watcher.monitor({ fireOnInitialValue: true }).subscribe(({ newValue }) => {
    debug('to script', `${name}: ${newValue}`);
    callback(newValue);
  });
};

/**
 * Main function.
 */
const main = async () => {
  try {
    // Update refresh interval.
    watchOutput('refreshInterval', 'number', (refreshInterval) => {
      if (globals.interval) {
        Time.clearInterval(globals.interval);
      }

      options.refreshInterval = refreshInterval;
      globals.interval = Time.setInterval(update, refreshInterval * 1000);
    });

    // Update date format.
    watchOutput('format', 'string', (format) => {
      options.format = format;
    });

    // Update debug option.
    watchOutput('debug', 'boolean', (debug) => {
      options.debug = debug;
    });
  } catch (err) {
    Diagnostics.log(err);
  }
};

main();
