/**
 * Custom hook for form validation
 * Provides validation logic, error state management, and submit handling
 */
import { useState, useCallback, useMemo } from 'react';

/**
 * Validation rules
 * @param {string} value - Field value
 * @param {Object} rules - Validation rules object
 * @returns {string|null} Error message or null if valid
 */
const validateField = (value, rules = {}) => {
  const { required, minLength, maxLength, pattern, custom, email, numeric, min, max } = rules;

  // Required
  if (required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return 'This field is required';
  }

  // Skip other validations if empty and not required
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }

  const strValue = String(value).trim();

  // Email
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(strValue)) {
      return 'Please enter a valid email address';
    }
  }

  // Numeric
  if (numeric) {
    const num = Number(strValue);
    if (isNaN(num)) {
      return 'Must be a valid number';
    }
    if (min !== undefined && num < min) {
      return `Must be at least ${min}`;
    }
    if (max !== undefined && num > max) {
      return `Must be no more than ${max}`;
    }
  }

  // Min length
  if (minLength && strValue.length < minLength) {
    return `Must be at least ${minLength} characters`;
  }

  // Max length
  if (maxLength && strValue.length > maxLength) {
    return `Must be no more than ${maxLength} characters`;
  }

  // Pattern (regex)
  if (pattern && !pattern.test(strValue)) {
    return 'Invalid format';
  }

  // Custom validator
  if (custom && typeof custom === 'function') {
    return custom(value);
  }

  return null;
};

/**
 * useFormValidation hook
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationRules - Validation rules per field
 * @returns {Object} Form state and handlers
 */
export const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Validate a single field
  const validate = useCallback(
    (name, value) => {
      const rules = validationRules[name];
      if (!rules) return null;
      return validateField(value, rules);
    },
    [validationRules]
  );

  // Validate all fields
  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((name) => {
      const error = validate(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validate, validationRules, values]);

  // Handle field change
  const handleChange = useCallback(
    (name, value) => {
      setValues((prev) => ({ ...prev, [name]: value }));

      // Clear error on change if field was touched
      if (touched[name]) {
        const error = validate(name, value);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [touched, validate]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (name) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validate(name, values[name]);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [validate, values]
  );

  // Set field value programmatically
  const setFieldValue = useCallback(
    (name, value, shouldValidate = true) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      if (shouldValidate && touched[name]) {
        const error = validate(name, value);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [touched, validate]
  );

  // Set field error programmatically
  const setFieldError = useCallback((name, error) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  // Reset form
  const resetForm = useCallback(
    (newValues = initialValues) => {
      setValues(newValues);
      setErrors({});
      setTouched({});
      setIsSubmitted(false);
      setSubmitError(null);
    },
    [initialValues]
  );

  // Handle submit
  const handleSubmit = useCallback(
    async (onSubmit) => {
      setIsSubmitting(true);
      setSubmitError(null);

      const isValid = validateAll();

      if (!isValid) {
        // Mark all fields as touched
        const allTouched = Object.keys(validationRules).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        );
        setTouched(allTouched);
        setIsSubmitting(false);
        return false;
      }

      try {
        await onSubmit(values);
        setIsSubmitted(true);
        setIsSubmitting(false);
        return true;
      } catch (error) {
        setSubmitError(error.message || 'Submission failed');
        setIsSubmitting(false);
        return false;
      }
    },
    [validateAll, validationRules, values]
  );

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(validationRules).every((name) => {
      const error = validate(name, values[name]);
      return !error;
    });
  }, [validate, validationRules, values]);

  // Check if form is dirty (changed from initial)
  const isDirty = useMemo(() => {
    return Object.keys(values).some((key) => values[key] !== initialValues[key]);
  }, [values, initialValues]);

  // Get field props for easy spreading
  const getFieldProps = useCallback(
    (name) => ({
      value: values[name] || '',
      onChangeText: (value) => handleChange(name, value),
      onBlur: () => handleBlur(name),
      error: touched[name] ? errors[name] : undefined,
    }),
    [values, errors, touched, handleChange, handleBlur]
  );

  return {
    // State
    values,
    errors,
    touched,
    isSubmitting,
    isSubmitted,
    submitError,
    isValid,
    isDirty,

    // Methods
    handleChange,
    handleBlur,
    handleSubmit,
    validate,
    validateAll,
    setFieldValue,
    setFieldError,
    resetForm,
    getFieldProps,
    setValues,
    setErrors,
    setTouched,
  };
};

export default useFormValidation;