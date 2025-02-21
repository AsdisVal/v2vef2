insert into categories (name)
values ('html');
insert into categories (name)
values ('css');
insert into categories (name)
values ('javascript');
INSERT INTO questions (category_id, question)
VALUES (1, 'What does HTML stand for?');
INSERT INTO answers (question_id, answer, is_correct)
VALUES (1, 'Hyper Text Markup Language', true);
INSERT INTO answers (question_id, answer, is_correct)
VALUES (1, 'Hyperlinks and Text Markup Language', false);
INSERT INTO answers (question_id, answer, is_correct)
VALUES (1, 'Home Tool Markup Language', false);
INSERT INTO answers (question_id, answer, is_correct)
VALUES (1, 'Hyperlinks and Text Markup Language', false);
INSERT INTO questions (category_id, question)
VALUES (
        2,
        'What is the correct HTML element for inserting a line break?'
    );
INSERT INTO answers (question_id, answer, is_correct)
VALUES (2, '<br>', true);
INSERT INTO answers (question_id, answer, is_correct)
VALUES (2, '<break>', false);
INSERT INTO answers (question_id, answer, is_correct)
VALUES (2, '<lb>', false);
INSERT INTO answers (question_id, answer, is_correct)
VALUES (2, '<linebreak>', false);
INSERT INTO questions (category_id, question)
VALUES (
        3,
        'Inside which HTML element do we put the JavaScript?'
    );
INSERT INTO answers (question_id, answer, is_correct)
VALUES (3, '<script>', true);
INSERT INTO answers (question_id, answer, is_correct)
VALUES (3, '<javascript>', false);
INSERT INTO answers (question_id, answer, is_correct)
VALUES (3, '<js>', false);
INSERT INTO answers (question_id, answer, is_correct)
VALUES (3, '<scripting>', false);