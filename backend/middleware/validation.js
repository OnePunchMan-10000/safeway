const { body, validationResult } = require('express-validator')

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    })
  }
  next()
}

const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('address')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),
  
  body('role')
    .isIn(['woman', 'volunteer'])
    .withMessage('Role must be either "woman" or "volunteer"'),
  
  handleValidationErrors
]

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body('role')
    .isIn(['woman', 'volunteer'])
    .withMessage('Role must be either "woman" or "volunteer"'),
  
  handleValidationErrors
]

const validateEmergencyAlert = [
  body('location.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('location.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('userDetails.name')
    .trim()
    .notEmpty()
    .withMessage('User name is required'),
  
  body('userDetails.phone')
    .notEmpty()
    .withMessage('User phone is required'),
  
  body('userDetails.address')
    .trim()
    .notEmpty()
    .withMessage('User address is required'),
  
  handleValidationErrors
]

module.exports = {
  validateRegistration,
  validateLogin,
  validateEmergencyAlert,
  handleValidationErrors
}