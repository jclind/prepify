const measurementTypes = [
  'drop',
  'drops',
  'dr',
  'drs',
  'smidgen',
  'smidgens',
  'smdg',
  'smdgs',
  'smi',
  'smis',
  'pinch',
  'pinches',
  'pn',
  'pns',
  'dash',
  'dashes',
  'ds',
  'dss',
  'clove',
  'package',
  'packages',
  'cloves',
  'saltspooon',
  'saltspooons',
  'jar',
  'jars',
  'scruple',
  'scruples',
  'ssp',
  'ssps',
  'coffeespoon',
  'coffeespoons',
  'csp',
  'csps',
  'fluiddram',
  'fluiddrams',
  'dram',
  'drams',
  'fldr',
  'fldrs',
  'dr',
  'drs',
  'teaspoon',
  'teaspoons',
  'tsp',
  'tsps',
  'dessertspoon',
  'dessertspoons',
  'dsp',
  'dsps',
  'dssp',
  'dssps',
  'dstspn',
  'dstspns',
  'tablespoon',
  'tablespoons',
  'tbsp',
  'tbsps',
  'tbl',
  'tbls',
  'tbs',
  'tbss',
  'fluidounce',
  'fluidounces',
  'ounce',
  'ounces',
  'floz',
  'flozs',
  'oz',
  'ozs',
  'wineglass',
  'wineglasses',
  'wgf',
  'wgfs',
  'gill',
  'gills',
  'teacup',
  'teacups',
  'tcf',
  'tcfs',
  'cup',
  'cups',
  'C',
  'Cs',
  'pint',
  'pints',
  'quart',
  'pt',
  'pts',
  'qt',
  'pound',
  'pounds',
  'lb',
  'lbs',
  'container',
  'containers',
  'qts',
  'pottle',
  'piece',
  'pieces',
  'pottles',
  'pot',
  'pots',
  'gallon',
  'gallons',
  'gal',
  'gals',
  'slice',
  'slices',
  'optional',
]

// Takes String, returns boolean based on if given string exists in measurementTypes
const measurementExists = str => {
  const preppedString = str.toLowerCase().split('.').join('')

  const typeExists = measurementTypes.includes(preppedString)

  return typeExists
}

// Takes String, returns boolean based on if given string is a number in fraction form
const isFraction = str => {
  const tempSplit = str.split('/')

  if (tempSplit.length !== 2) {
    return false
  }

  const allValsAreNums = tempSplit.every(
    i => !isNaN(Number(i)) && i.trim() !== ''
  )
  if (!allValsAreNums) {
    return false
  }

  return true
}
export const evalNum = str => {
  if (!isNaN(str)) {
    return Number(str)
  }
  const evalFraction = frac => {
    const split = frac.split('/')
    const res = parseInt(Number(split[0]), 10) / parseInt(Number(split[1]), 10)
    return Number(res)
  }
  if (isFraction(str)) {
    return evalFraction(str)
  }

  const splitVal = str.split(/[\s-]/)
  if (splitVal.length <= 0) return 0
  if (splitVal.length === 1) {
    if (isFraction(splitVal[0])) {
      return evalFraction(splitVal[0])
    } else {
      return Number(splitVal[0])
    }
  } else {
    console.log("This shouldn't be happening in evalNum")
  }
}

export const validateQuantity = str => {
  const splitVal = str.split(/[\s-]/)

  // If the split val length is greater than 2, then it will be called invalid
  if (splitVal.length > 2) {
    return {
      err: 'Str invalid length, make sure to only enter whole or mixed numbers',
    }
  }

  // If there are two values in splitVal check that both are valid
  if (splitVal.length === 2) {
    // If the first value isn't a whole number, call error
    if (isNaN(splitVal[0])) {
      return { err: 'Invalid number, please check quantity again' }
    } else if (splitVal[0] % 1 !== 0) {
      return { err: 'Please enter whole or mixed numbers only, no decimals' }
    }
    // If the second value isn't a fraction, call error
    if (!isFraction(splitVal[1])) {
      return {
        err: 'Invalid fraction. Please make sure to enter mixed number correctly',
      }
    }

    return {}
  }

  // If there is only one number entered check that it's valid
  if (splitVal.length === 1) {
    if (isNaN(splitVal[0]) && !isFraction(splitVal[0])) {
      return { err: 'Number entered must be a valid whole or mixed number' }
    }
    if (isFraction(splitVal[0])) {
      return {}
    }
    if (splitVal[0] % 1 !== 0) {
      return { err: 'Please enter whole or mixed numbers only, no decimals' }
    }

    return {}
  }

  return {
    err: 'Something went wrong, please check that the quantity entered is a valid whole or mixed number',
  }
}

const validateQuantityandMeasurements = str => {
  const splitVal = str.split(' ')

  if (splitVal.length === 1 && !isNaN(splitVal[0].trim())) {
    const num = Number(splitVal[0].trim())
    const contentHTML = `${num}`
    return {
      quantity: num,
      measurement: null,
      contentHTML,
    }
  }
  if (splitVal.length === 1 && isFraction(splitVal[0].trim())) {
    const num = evalNum(splitVal[0].trim())
    const contentHTML = `${num}`
    return {
      quantity: num,
      measurement: null,
      contentHTML,
    }
  }
  if (splitVal.length === 2 && !isNaN(splitVal[0]) && isFraction(splitVal[1])) {
    const wholeNum = Number(splitVal[0])
    const decimalNum = evalNum(splitVal[1].trim())
    const contentHTML = `${wholeNum} ${splitVal[1]}`
    return {
      quantity: wholeNum + decimalNum,
      measurement: null,
      contentHTML,
    }
  }

  if (splitVal.length <= 1) {
    return { err: 'ERROR, PLEASE ENTER BOTH QUANTITY AND MEASUREMENT' }
  }

  // If first value is not a number or a fraction, then return an error
  if (isNaN(splitVal[0]) && !isFraction(splitVal[0])) {
    return { err: 'ERROR, NO VALUE PROVIDED FOR INGREDIENT' }
  }

  // If first value is a fraction and the second value does not match the quantity types the return error
  const singleNumberQuantityTypeStr = [...splitVal].slice(1).join('')
  if (
    isFraction(splitVal[0]) &&
    !measurementExists(singleNumberQuantityTypeStr)
  ) {
    return {
      err: 'ERROR, PLEASE ENTER CORRECT QUANTITY TYPE IE CUP C TABLESPOON TBS OUNCE OZ',
    }
  }

  // If first value is a number, second number is neither a fraction or a quantity type, return error
  const mixedNumberQuantityTypeStr = [...splitVal].slice(2).join('')
  if (
    !isNaN(splitVal[0]) &&
    !isFraction(splitVal[1]) &&
    !measurementExists(singleNumberQuantityTypeStr)
  ) {
    return { err: 'ERROR, PLEASE ENTER QUANTITY' }
  }
  // If first value is a number, second value is a fraction and final value is not a valid quantity
  else if (
    isFraction(splitVal[1]) &&
    !measurementExists(mixedNumberQuantityTypeStr)
  ) {
    return { err: 'ERROR, PLEASE ENTER VALID QUANTITY TYPE' }
  }

  // If first value is a number and second value is a measurement type,
  // check that number is valid and return data object
  if (!isNaN(splitVal[0]) && measurementExists(singleNumberQuantityTypeStr)) {
    const num = Number(splitVal[0])
    if (num <= 0) {
      return { err: 'ERROR, PLEASE ENTER NUMBER GREATER THAN 0' }
    }
    if (num % 1 !== 0) {
      return {
        err: 'ERROR, PLEASE ENTER MIXED NUMBER RATHER THAN A DECIMAL. IE: 1 1/2',
      }
    }

    // Hold html that will be rendered in quantityInput
    const contentHTML = `${num} <span className="valid-measurement">${singleNumberQuantityTypeStr}</span>`

    return {
      quantity: num,
      measurement: singleNumberQuantityTypeStr,
      contentHTML,
    }
  }
  // If first value is a fraction, convert fraction to decimal and return data object
  if (isFraction(splitVal[0])) {
    const num = evalNum(splitVal[0])

    // Hold html that will be rendered in quantityInput
    const contentHTML = `${splitVal[0]} <span className="valid-measurement">${singleNumberQuantityTypeStr}</span>`

    return {
      quantity: num,
      measurement: singleNumberQuantityTypeStr,
      contentHTML,
    }
  }

  // If first value is a number and second value is a fraction, convert fraction to decimal
  // check that the number is valid and add the both numbers. return data object
  const wholeNum = Number(splitVal[0])
  const decimalNum = evalNum(splitVal[1])
  if (wholeNum <= 0) {
    return { err: 'ERROR, PLEASE ENTER NUMBER GREATER THAN 0' }
  }
  if (wholeNum % 1 !== 0) {
    return {
      err: 'ERROR, PLEASE ENTER MIXED NUMBER RATHER THAN A DECIMAL. IE: 1 1/2',
    }
  }

  // Hold html that will be rendered in quantityInput
  const contentHTML = `${wholeNum} ${splitVal[1]} <span className="valid-measurement">${singleNumberQuantityTypeStr}</span>`

  return {
    quantity: wholeNum + decimalNum,
    measurement: mixedNumberQuantityTypeStr,
    contentHTML,
  }
}

const validateAdditionalInstructions = str => {
  if (str.length > 50) {
    return {
      err: 'ERROR, PLEASE LIMIT ADDITIONAL INSTRUCTIONS TO 50 OR LESS CHARACTERS',
    }
  }

  return { additionalInstructions: str.trim() }
}

export const validateIngredientQuantityStr = str => {
  // split string at comma to get quantity
  // and measurements at index 0 and additional instructions at index 1
  const splitStr = str.split(',')

  const quantityAndMeasurements = validateQuantityandMeasurements(splitStr[0])
  if (quantityAndMeasurements.err) {
    return quantityAndMeasurements
  }

  const additionalInstructions = splitStr[1]
    ? validateAdditionalInstructions(splitStr[1])
    : null
  if (additionalInstructions && additionalInstructions.err) {
    return additionalInstructions
  }

  const ingredientData = additionalInstructions
    ? { ...quantityAndMeasurements, ...additionalInstructions }
    : { ...quantityAndMeasurements }

  if (additionalInstructions) {
    ingredientData.contentHTML = `${ingredientData.contentHTML}, ${additionalInstructions.additionalInstructions}`
  }

  return ingredientData
}
