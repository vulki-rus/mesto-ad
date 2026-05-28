const showInputError = (formElement, inputElement, errorMessage, settings) => {
  const errorElement = formElement.querySelector(`#${inputElement.id}-error`);
  if (!errorElement) return;

  inputElement.classList.add(settings.inputErrorClass);
  errorElement.textContent = errorMessage;
  errorElement.classList.add(settings.errorClass);
};

const hideInputError = (formElement, inputElement, settings) => {
  const errorElement = formElement.querySelector(`#${inputElement.id}-error`);
  if (!errorElement) return;

  inputElement.classList.remove(settings.inputErrorClass);
  errorElement.textContent = "";
  errorElement.classList.remove(settings.errorClass);
};

const checkInputValidity = (formElement, inputElement, settings) => {
  if (inputElement.id === 'name' || inputElement.id === 'card-name') {
    const regex = /^[A-Za-zА-Яа-яёЁ\-\s]*$/;
    if (inputElement.value.trim() && !regex.test(inputElement.value.trim())) {
      inputElement.setCustomValidity('Разрешены только буквы (латиница/кириллица), дефис и пробел');
      showInputError(formElement, inputElement, inputElement.validationMessage, settings);
      return;
    }
  }
  
  if (inputElement.validity.patternMismatch || inputElement.validity.typeMismatch) {
    inputElement.setCustomValidity(inputElement.dataset.errorMessage);
    showInputError(
      formElement,
      inputElement,
      inputElement.validationMessage,
      settings,
    );
    return;
  }

  const trimmedValueLength = inputElement.value.trim().length;
  const minLength = parseInt(inputElement.getAttribute("minlength"));
  if (trimmedValueLength < minLength) {
    inputElement.setCustomValidity(`Пожалуйста, используйте не менее ${minLength} символов.`);
    showInputError(
      formElement,
      inputElement,
      inputElement.validationMessage,
      settings,
    );
    return;
  }

  inputElement.setCustomValidity("");
  hideInputError(formElement, inputElement, settings);
};

const hasInvalidInput = (inputsElements) => {
  return inputsElements.some((inputElement) => !inputElement.validity.valid);
};

const disableSubmitButton = (buttonElement, settings) => {
  buttonElement.disabled = true;
  buttonElement.classList.add(settings.inactiveButtonClass);
};

const enableSubmitButton = (buttonElement, settings) => {
  buttonElement.disabled = false;
  buttonElement.classList.remove(settings.inactiveButtonClass);
};

const toggleButtonState = (inputsElements, buttonElement, settings) => {
  if (hasInvalidInput(inputsElements)) {
    disableSubmitButton(buttonElement, settings);
  } else {
    enableSubmitButton(buttonElement, settings);
  }
};

const setEventListeners = (formElement, settings) => {
  const inputsElements = Array.from(
    formElement.querySelectorAll(settings.inputSelector),
  );
  const buttonElement = formElement.querySelector(
    settings.submitButtonSelector,
  );

  toggleButtonState(inputsElements, buttonElement, settings);

  inputsElements.forEach((inputElement) => {
    inputElement.addEventListener("input", () => {
      checkInputValidity(formElement, inputElement, settings);
      toggleButtonState(inputsElements, buttonElement, settings);
    });
  });
};

export const clearValidation = (formElement, settings) => {
  const inputsElements = Array.from(
    formElement.querySelectorAll(settings.inputSelector),
  );
  const buttonElement = formElement.querySelector(
    settings.submitButtonSelector,
  );

  inputsElements.forEach((inputElement) => {
    hideInputError(formElement, inputElement, settings);
    inputElement.setCustomValidity("");
  });

  disableSubmitButton(buttonElement, settings);
};

export const enableValidation = (settings) => {
  const formsElements = Array.from(
    document.querySelectorAll(settings.formSelector),
  );

  formsElements.forEach((formElement) => {
    setEventListeners(formElement, settings);
  });
};