INSERT INTO app_user (
    firstname,
    lastname,
    email,
    passwordhash,
    isblocked,
    status,
    role_id
)
VALUES
    ('Ace', 'Tafalla', 'acetafalla14@gmail.com', NULL, FALSE, 'Active', 1),
    ('Kenchie', 'Cabug-os', 'kenchieangiyonglingkod@gmail.com', NULL, FALSE, 'Active', 1),
    ('Sean Andrei', 'Manabat', 'seanmanabat1@gmail.com', NULL, FALSE, 'Active', 1),
    ('Francis Macline', 'Olinares', 'Maclinefrancis@gmail.com', NULL, FALSE, 'Active', 1),
    ('Jay M A.', 'Medija', 'jaymmedija21@gmail.com', NULL, FALSE, 'Active', 1)
ON CONFLICT (email) DO NOTHING;