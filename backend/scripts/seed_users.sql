-- Local development only. Select the carecell database before running this file.
-- Passwords are patient, doctor, and admin; hashes use the application's Argon2 format.

CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(320) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'Patient',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ix_users_email (email)
);

INSERT INTO users (email, full_name, hashed_password, role)
VALUES
    (
        'patient@test.com',
        'Patient',
        '$argon2id$v=19$m=65536,t=3,p=4$7j0BZOctkgAjwLkiXAjRyw$cA7gLfWX7kGgcX1wtA9JILEA0GdQidVrpvqpZQPuQxI',
        'Patient'
    ),
    (
        'doctor@test.com',
        'Doctor',
        '$argon2id$v=19$m=65536,t=3,p=4$FXdvY4EPWtcK+g+HWDO1fQ$O3agCaYN7+g3xOFTHl3GUsaIdqsiSdCtk1gGIZw/G+g',
        'Doctor'
    ),
    (
        'admin@test.com',
        'Admin',
        '$argon2id$v=19$m=65536,t=3,p=4$mJhKqoEXsU2iM7hXCdV4pA$eIbb4zEyvdfH37pHlkRWXrDEADZvE26gxtd0uPbMYy0',
        'Admin'
    )
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    hashed_password = VALUES(hashed_password),
    role = VALUES(role);
    