## Overview
- This submission contains high-fidelity UI mockups for Hope Inc.

## Screens
- Landing Page (Optional)
- Login
- Register
- Reset password
- Main page — Superadmin
- Main page — Admin
- Main page — User
- User Management - Superadmin
- User Management - Admin
- Rights dialog

## Roles and access
- **Superadmin:** - Have full system access. They can manage all modules and manage all accounts, assign Admin role, and set rights for Users.
- **Admin:** - Can manage most modules and user rights (except Superadmin accounts).
- **User:** - Have access to the core modules assigned to them. Contact an Admin for elevated permissions.

## Design link
https://www.figma.com/design/aUut564CpsLvotZhkUVaAa/Hope-Inc.?node-id=174-36&t=zKDzYNW8nCfwh7Nq-0

## Developer handoff
- **Navigation:** They can move through screens using the buttons like "Sign In" and "Register"
- **Interactions:** The Login and Register buttons submit their forms and show validation or error messages when required information is missing or invalid. 
Password visibility controls show or hide the password. On the main page, navigation links open the relevant sections. 
In User Management, authorized admins can search users, add or edit a user, and open the Rights dialog. 
The Rights dialog lets authorized admins select a user’s permissions, save changes, or cancel. Successful actions show a confirmation message. 
Actions the current role is not allowed to perform are hidden or disabled.
