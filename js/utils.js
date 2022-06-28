/**
 * @param {Number} min Min
 * @param {Number} max Max
 * @returns Random number between Min and Max(exclusive)
 */
 function random(min, max) {
  let rand = Math.random();

  if (typeof min === 'undefined') {
    return rand;
  } else if (typeof max === 'undefined') {
    if (min instanceof Array) {
      return min[Math.floor(rand * min.length)];
    } else if(typeof min === 'number') {
      return Math.floor(rand * min);
    }
  } else {
    if (min > max) {
      const tmp = min;
      min = max;
      max = tmp;
    }

    return Math.floor(rand * (max - min) + min);
  }
}

/**
 * Get data from a json or text file
 */
function getFileContents(filePath, type) {
  return fetch(filePath)
    .then(response => {
      if (response.ok) {
        if (type === 'json') {
          return response.json();
        } else {
          return response.text();
        }
      } else {
        throw new Error(`Could not fetch ${filePath}`);
      }
    });
}

/**
 * Show an element
 */
function show(element) {
  if (element.classList.contains('hidden')) {
    element.classList.remove('hidden');
  }
}

/** 
 * Hide an element
 */
function hide(element) {
  if(!element.classList.contains('hidden')) {
    element.classList.add('hidden');
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Show an object with properties:
 * min and max
 */
function showRange(obj) {
  return `${obj.min} - ${obj.max}`;
}

/**
 * Add up the values of an object
 */
function sum(obj) {
  let sum = 0;
  for (let key in obj) {
    sum += obj[key];
  }
  return sum;
}