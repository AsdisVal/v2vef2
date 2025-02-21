CREATE TABLE IF NOT EXISTS public.categories (
    id serial primary key,
    name varchar(64) not null unique,
);
CREATE TABLE IF NOT EXISTS public.questions (
    id serial primary key,
    category_id integer not null references public.categories(id) on delete cascade,
    question text not null check (
        char_length(question) between 10 and 500
    )
);
CREATE TABLE IF NOT EXISTS public.answers (
    id serial primary key,
    question_id integer not null references public.questions(id) on delete cascade,
    answer TEXT NOT NULL CHECK (
        char_length(answer) BETWEEN 1 AND 255
    ),
    is_correct boolean default false not null
);