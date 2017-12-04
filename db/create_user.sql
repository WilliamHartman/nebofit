insert into users (user_first_name, user_last_name, email, img, auth_id) values ($1, $2, $3, $4, $5)
returning *;