CREATE TABLE IF NOT EXISTS public.categories (
    id serial primary key,
    name varchar(64) not null unique,
    created timestamp with time zone not null default current_timestamp
);
CREATE TABLE IF NOT EXISTS public.questions (
    id serial primary key,
    category_id integer not null references public.categories(id) on delete cascade,
    question_text text not null,
    created timestamp with time zone not null default current_timestamp
);
CREATE TABLE IF NOT EXISTS public.answers (
    id serial primary key,
    question_id integer not null references public.questions(id),
    answer_text text not null,
    is_correct boolean default false,
    created timestamp with time zone not null default current_timestamp
);