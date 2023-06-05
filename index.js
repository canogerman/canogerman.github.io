const firstNameInput = document.getElementById("firstname");
const lastNameInput = document.getElementById("lastname");
const userNameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const passwordConfirmInput = document.getElementById("password-confirm");
const birthdayInput = document.getElementById("birthday");

firstNameInput.addEventListener("input", function (event) {
  const value = event.target.value;

  // Validate that only letters are allowed
  if (!/^[A-Za-z]+$/.test(value)) {
    event.target.setCustomValidity("Please enter only letters");
  } else {
    // Validate the maximum length
    if (value.length > 20) {
      event.target.setCustomValidity(
        "The first name must have a maximum of 20 characters"
      );
    } else {
      event.target.setCustomValidity(""); // Clear custom error message if validation passes
    }
  }
});

// It is clear that here I must unify firstname and lastname in a single function 😓.

lastNameInput.addEventListener("input", function (event) {
  const value = event.target.value;

  // Validate that only letters are allowed
  if (!/^[A-Za-z]+$/.test(value)) {
    event.target.setCustomValidity("Please enter only letters");
  } else {
    // Validate the maximum length
    if (value.length > 20) {
      event.target.setCustomValidity(
        "The last name must have a maximum of 20 characters"
      );
    } else {
      event.target.setCustomValidity("");
    }
  }
});

userNameInput.addEventListener("input", function (event) {
  const value = event.target.value;

  // Validate that only letters and numbers are allowed
  if (!/^[A-Za-z0-9]+$/.test(value)) {
    event.target.setCustomValidity("Please enter only letters and numbers");
  } else {
    // Validate the maximum length
    if (value.length > 10) {
      event.target.setCustomValidity(
        "The user name must have a maximum of 10 characters"
      );
    } else {
      event.target.setCustomValidity("");
    }
  }
});

passwordInput.addEventListener("input", function (event) {
  const value = event.target.value;

  // Validate that 8 character are allowed whit uppercase and numbers.
  if (!/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8}$/.test(value)) {
    event.target.setCustomValidity(
      "Password must be 8 characters. at least 1 must be uppercase and at least 1 must be a number"
    );
  } else {
    event.target.setCustomValidity("");
  }
});

passwordConfirmInput.addEventListener("input", function (event) {
  const value = event.target.value;
  if (passwordInput.value !== value) {
    event.target.setCustomValidity("The password does not match");
  } else {
    event.target.setCustomValidity("");
  }
});

const form = document.querySelector("form");

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const firstNameValue = firstNameInput.value;
  const lastNameValue = lastNameInput.value;
  const userNameValue = userNameInput.value;
  const birthdayValue = birthdayInput.value;

  const confirmationMessage = `The data entered is:
        First name: ${firstNameValue}
        Last name: ${lastNameValue}
        User name:${userNameValue}
        Birthday: ${birthdayValue}
      
        Are you sure you want to submit the form?`;

  if (confirm(confirmationMessage)) {
    // User confirmed, submit the form
    form.submit();
  } else {
    // User cancelled, do nothing
  }
});
