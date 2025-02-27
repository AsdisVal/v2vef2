CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    slug CHARACTER VARYING(128) NOT NULL UNIQUE,
    name CHARACTER VARYING(64) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS public.questions (
    id SERIAL PRIMARY KEY,
    text CHARACTER VARYING(1024) NOT NULL,
    category_id integer NOT NULL REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS public.answers (
    id serial primary key,
    text CHARACTER VARYING(1024) NOT NULL,
    question_id integer NOT NULL REFERENCES questions(id),
    correct BOOLEAN DEFAULT false
);