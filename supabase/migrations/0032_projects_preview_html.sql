-- Statyczny snapshot HTML startowej strony projektu — używany w dashboardzie
-- jako miniaturka (iframe srcDoc, bez JS). Aktualizowany async po save / generate.
alter table projects add column if not exists preview_html text;
