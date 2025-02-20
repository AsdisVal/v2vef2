CREATE TABLE IF NOT EXISTS public.categories (
    id serial primary key,
    name varchar(64) not null unique,
    created timestamp with time default current_timestamp not null
);
CREATE TABLE IF NOT EXISTS public.questions (
    id serial primary key,
    category_id integer not null references public.categories(id) on delete cascade,
    question_text text not null check (
        char_length(question_text) between 10 and 500
    ),
    created timestamp with time zone default current_timestamp not null
);
CREATE TABLE IF NOT EXISTS public.answers (
    id serial primary key,
    question_id integer not null references public.questions(id) on delete cascade,
    answer_text TEXT NOT NULL CHECK (
        char_length(answer_text) BETWEEN 1 AND 255
    ),
    is_correct boolean default false not null,
    created timestamp with time zone default current_timestamp not null
);