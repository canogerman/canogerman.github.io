const form = document.querySelector("form");
const firstNameInput = document.getElementById("firstname");
const lastNameInput = document.getElementById("lastname");
const userNameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const passwordConfirmInput = document.getElementById("password-confirm");
const birthdayInput = document.getElementById("birthday");

firstNameInput.addEventListener("input", function (event) {
  const value = event.target.value;
  const regExp = new RegExp(/^[A-Za-z]+$/);
  // Validate that only letters are allowed
  if (!regExp.test(value)) {
    event.target.setCustomValidity("Please enter only letters");
  }
  // Validate the maximum length
  if (value.length > 20) {
    event.target.setCustomValidity(
      "The first name must have a maximum of 20 characters"
    );
  }
  event.target.setCustomValidity(""); // Clear custom error message if validation passes
});

lastNameInput.addEventListener("input", function (event) {
  const value = event.target.value;
  const regExp = new RegExp(/^[A-Za-z]+$/);
  // Validate that only letters are allowed
  if (!regExp.test(value)) {
    event.target.setCustomValidity("Please enter only letters");
  }
  // Validate the maximum length
  if (value.length > 20) {
    event.target.setCustomValidity(
      "The last name must have a maximum of 20 characters"
    );
  }
  event.target.setCustomValidity("");
});

userNameInput.addEventListener("input", function (event) {
  const value = event.target.value;
  const regExp = new RegExp(/^[A-Za-z0-9]+$/);
  // Validate that only letters and numbers are allowed
  if (!regExp.test(value)) {
    event.target.setCustomValidity("Please enter only letters and numbers");
  }
  // Validate the maximum length
  if (value.length > 10) {
    event.target.setCustomValidity(
      "The user name must have a maximum of 10 characters"
    );
  }
  event.target.setCustomValidity("");
});

passwordInput.addEventListener("input", function (event) {
  const value = event.target.value;
  const regExp = new RegExp(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8}$/);
  // Validate that 8 character are allowed whit uppercase and numbers.
  if (!regExp.test(value)) {
    event.target.setCustomValidity(
      "Password must be 8 characters. at least 1 must be uppercase and at least 1 must be a number"
    );
  }
  event.target.setCustomValidity("");
});

passwordConfirmInput.addEventListener("input", function (event) {
  const value = event.target.value;
  if (passwordInput.value !== value) {
    event.target.setCustomValidity("The password does not match");
  }
  event.target.setCustomValidity("");
});

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
  }
});
