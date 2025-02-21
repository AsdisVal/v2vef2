CREATE TABLE IF NOT EXISTS public.flokkar (
    id serial primary key,
    nafn varchar(64) not null unique
);
CREATE TABLE IF NOT EXISTS public.spurningar (
    id serial primary key,
    flokkur_id integer not null references public.flokkar(id) on delete cascade,
    spurning text not null check (
        char_length(spurning) between 10 and 500
    )
);
CREATE TABLE IF NOT EXISTS public.svor (
    id serial primary key,
    spurning_id integer not null references public.spurningar(id) on delete cascade,
    svar TEXT NOT NULL CHECK (
        char_length(svar) BETWEEN 1 AND 255
    ),
    rett_svar boolean default false not null
);