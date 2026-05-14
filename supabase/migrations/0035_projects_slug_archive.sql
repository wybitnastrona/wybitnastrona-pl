-- Archiwizacja custom slugow przy anulowaniu subskrypcji (anty-abuse).
-- Gdy user cancelluje PRO, custom slug zostaje cofniety do auto-generated,
-- ale poprzedni zachowujemy zeby przywrocic po reaktywacji.

alter table projects add column if not exists custom_slug_archived text;
