# TODO: Refactor bcrypt usage to async methods

## Steps to Complete

1. **Validate SALTROUNDS environment variable** ✅
   - Add validation in app.js or a utility file to ensure SALTROUNDS is a valid number, default to 10 if invalid/missing.

2. **Refactor login.controller.js** ✅
   - Change bcrypt.compareSync to bcrypt.compare (async)
   - Update the login function to handle async bcrypt operation

3. **Refactor register.controller.js** ✅
   - Change bcrypt.hashSync to bcrypt.hash (async)
   - Update the register function to handle async bcrypt operation

4. **Refactor resetPassword.controller.js** ✅
   - Change bcryptjs.hashSync to bcrypt.hash (async) in resetPassword function
   - Update the resetPassword function to handle async bcrypt operation

5. **Refactor teacher.controller.js**
   - Change bcryptjs.hashSync to bcrypt.hash (async) in addTeacher and updateTeacher functions
   - Update the functions to handle async bcrypt operations

6. **Refactor supervisor.controller.js** ✅
   - Change bcryptjs.hashSync to bcrypt.hash (async) in relevant functions
   - Update functions to handle async operations

7. **Refactor student.controller.js** ✅
   - Change bcryptjs.hashSync to bcrypt.hash (async) in relevant functions
   - Update functions to handle async operations

8. **Refactor school.controller.js**
   - Change bcryptjs.hashSync to bcrypt.hash (async) in relevant functions
   - Update functions to handle async operations

9. **Add error handling for bcrypt operations**
   - Wrap bcrypt calls in try-catch blocks where appropriate
   - Return appropriate error messages if bcrypt fails

10. **Test the changes**
    - Run the backend server
    - Test registration, login, password reset, and user management flows
    - Ensure no blocking occurs and operations complete successfully
