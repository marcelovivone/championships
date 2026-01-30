-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

-- DROP SEQUENCE public.cities_id_seq;

CREATE SEQUENCE public.cities_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.cities_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.cities_id_seq TO "admin";

-- DROP SEQUENCE public.club_stadiums_id_seq;

CREATE SEQUENCE public.club_stadiums_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.club_stadiums_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.club_stadiums_id_seq TO "admin";

-- DROP SEQUENCE public.clubs_id_seq;

CREATE SEQUENCE public.clubs_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.clubs_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.clubs_id_seq TO "admin";

-- DROP SEQUENCE public.countries_id_seq;

CREATE SEQUENCE public.countries_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.countries_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.countries_id_seq TO "admin";

-- DROP SEQUENCE public.groups_id_seq;

CREATE SEQUENCE public.groups_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.groups_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.groups_id_seq TO "admin";

-- DROP SEQUENCE public.league_links_id_seq;

CREATE SEQUENCE public.league_links_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.league_links_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.league_links_id_seq TO "admin";

-- DROP SEQUENCE public.leagues_id_seq;

CREATE SEQUENCE public.leagues_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.leagues_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.leagues_id_seq TO "admin";

-- DROP SEQUENCE public.match_divisions_id_seq;

CREATE SEQUENCE public.match_divisions_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.match_divisions_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.match_divisions_id_seq TO "admin";

-- DROP SEQUENCE public.match_events_id_seq;

CREATE SEQUENCE public.match_events_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.match_events_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.match_events_id_seq TO "admin";

-- DROP SEQUENCE public.matches_id_seq;

CREATE SEQUENCE public.matches_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.matches_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.matches_id_seq TO "admin";

-- DROP SEQUENCE public.menu_items_id_seq;

CREATE SEQUENCE public.menu_items_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.menu_items_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.menu_items_id_seq TO "admin";

-- DROP SEQUENCE public.profile_permissions_id_seq;

CREATE SEQUENCE public.profile_permissions_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.profile_permissions_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.profile_permissions_id_seq TO "admin";

-- DROP SEQUENCE public.rounds_id_seq;

CREATE SEQUENCE public.rounds_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.rounds_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.rounds_id_seq TO "admin";

-- DROP SEQUENCE public.season_clubs_id_seq;

CREATE SEQUENCE public.season_clubs_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.season_clubs_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.season_clubs_id_seq TO "admin";

-- DROP SEQUENCE public.seasons_id_seq;

CREATE SEQUENCE public.seasons_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.seasons_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.seasons_id_seq TO "admin";

-- DROP SEQUENCE public.sport_clubs_id_seq;

CREATE SEQUENCE public.sport_clubs_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.sport_clubs_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.sport_clubs_id_seq TO "admin";

-- DROP SEQUENCE public.sports_id_seq;

CREATE SEQUENCE public.sports_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.sports_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.sports_id_seq TO "admin";

-- DROP SEQUENCE public.stadiums_id_seq;

CREATE SEQUENCE public.stadiums_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.stadiums_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.stadiums_id_seq TO "admin";

-- DROP SEQUENCE public.standings_id_seq;

CREATE SEQUENCE public.standings_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.standings_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.standings_id_seq TO "admin";

-- DROP SEQUENCE public.user_permissions_id_seq;

CREATE SEQUENCE public.user_permissions_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.user_permissions_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.user_permissions_id_seq TO "admin";

-- DROP SEQUENCE public.users_id_seq;

CREATE SEQUENCE public.users_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.users_id_seq OWNER TO "admin";
GRANT ALL ON SEQUENCE public.users_id_seq TO "admin";
-- public.countries definition

-- Drop table

-- DROP TABLE public.countries;

CREATE TABLE public.countries (
	id serial4 NOT NULL,
	"name" varchar(100) NOT NULL,
	continent varchar(50) NOT NULL,
	flag_url text NULL,
	code varchar(3) NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT countries_code_unique UNIQUE (code),
	CONSTRAINT countries_pkey PRIMARY KEY (id)
);

-- Permissions

ALTER TABLE public.countries OWNER TO "admin";
GRANT ALL ON TABLE public.countries TO "admin";


-- public.menu_items definition

-- Drop table

-- DROP TABLE public.menu_items;

CREATE TABLE public.menu_items (
	id serial4 NOT NULL,
	code varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	description text NULL,
	category varchar(50) NOT NULL,
	parent_id int4 NULL,
	"order" int4 DEFAULT 0 NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT menu_items_code_unique UNIQUE (code),
	CONSTRAINT menu_items_pkey PRIMARY KEY (id)
);

-- Permissions

ALTER TABLE public.menu_items OWNER TO "admin";
GRANT ALL ON TABLE public.menu_items TO "admin";


-- public.sports definition

-- Drop table

-- DROP TABLE public.sports;

CREATE TABLE public.sports (
	id serial4 NOT NULL,
	"name" varchar(100) NOT NULL,
	reduced_name varchar(20) NOT NULL,
	"type" varchar(20) NOT NULL,
	division_type varchar(20) NOT NULL,
	division_time int4 NOT NULL,
	score_type varchar(20) NOT NULL,
	has_overtime bool DEFAULT false NOT NULL,
	has_penalties bool DEFAULT false NOT NULL,
	image_url text NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	flg_default bool DEFAULT false NOT NULL,
	min_match_divisions_number int4 NOT NULL,
	max_match_divisions_number int4 NOT NULL,
	CONSTRAINT sports_name_unique UNIQUE (name),
	CONSTRAINT sports_pkey PRIMARY KEY (id)
);

-- Permissions

ALTER TABLE public.sports OWNER TO "admin";
GRANT ALL ON TABLE public.sports TO "admin";


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id serial4 NOT NULL,
	email varchar(255) NOT NULL,
	"password" text NOT NULL,
	"name" varchar(100) NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	profile varchar(20) DEFAULT 'final_user'::character varying NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT users_email_unique UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Permissions

ALTER TABLE public.users OWNER TO "admin";
GRANT ALL ON TABLE public.users TO "admin";


-- public.cities definition

-- Drop table

-- DROP TABLE public.cities;

CREATE TABLE public.cities (
	id serial4 NOT NULL,
	"name" varchar(100) NOT NULL,
	country_id int4 NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT cities_pkey PRIMARY KEY (id),
	CONSTRAINT cities_country_id_countries_id_fk FOREIGN KEY (country_id) REFERENCES public.countries(id)
);

-- Permissions

ALTER TABLE public.cities OWNER TO "admin";
GRANT ALL ON TABLE public.cities TO "admin";


-- public.clubs definition

-- Drop table

-- DROP TABLE public.clubs;

CREATE TABLE public.clubs (
	id serial4 NOT NULL,
	"name" varchar(150) NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	short_name varchar(50) NULL,
	image_url text NULL,
	foundation_year int4 NULL,
	country_id int4 NOT NULL,
	city_id int4 NULL,
	CONSTRAINT clubs_pkey PRIMARY KEY (id),
	CONSTRAINT clubs_city_id_cities_id_fk FOREIGN KEY (city_id) REFERENCES public.cities(id),
	CONSTRAINT clubs_country_id_countries_id_fk FOREIGN KEY (country_id) REFERENCES public.countries(id)
);

-- Permissions

ALTER TABLE public.clubs OWNER TO "admin";
GRANT ALL ON TABLE public.clubs TO "admin";


-- public.leagues definition

-- Drop table

-- DROP TABLE public.leagues;

CREATE TABLE public.leagues (
	id serial4 NOT NULL,
	sport_id int4 NOT NULL,
	country_id int4 NULL,
	image_url text NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	original_name varchar(150) NOT NULL,
	secondary_name varchar(150) NULL,
	city_id int4 NULL,
	number_of_rounds_matches int4 DEFAULT 0 NOT NULL,
	min_divisions_number int4 NOT NULL,
	max_divisions_number int4 NOT NULL,
	divisions_time int4 NULL,
	has_overtime_override bool NULL,
	has_penalties_override bool NULL,
	has_ascends bool DEFAULT false NOT NULL,
	ascends_quantity int4 NULL,
	has_descends bool DEFAULT false NOT NULL,
	descends_quantity int4 NULL,
	has_sub_leagues bool DEFAULT false NOT NULL,
	number_of_sub_leagues int4 NULL,
	flg_default bool DEFAULT false NOT NULL,
	flg_round_automatic bool DEFAULT true NOT NULL,
	type_of_schedule varchar(10) DEFAULT 'Round'::character varying NOT NULL,
	CONSTRAINT leagues_pkey PRIMARY KEY (id),
	CONSTRAINT leagues_city_id_cities_id_fk FOREIGN KEY (city_id) REFERENCES public.cities(id),
	CONSTRAINT leagues_country_id_countries_id_fk FOREIGN KEY (country_id) REFERENCES public.countries(id),
	CONSTRAINT leagues_sport_id_sports_id_fk FOREIGN KEY (sport_id) REFERENCES public.sports(id)
);

-- Permissions

ALTER TABLE public.leagues OWNER TO "admin";
GRANT ALL ON TABLE public.leagues TO "admin";


-- public.profile_permissions definition

-- Drop table

-- DROP TABLE public.profile_permissions;

CREATE TABLE public.profile_permissions (
	id serial4 NOT NULL,
	profile varchar(20) NOT NULL,
	menu_item_id int4 NOT NULL,
	can_access bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT profile_permissions_pkey PRIMARY KEY (id),
	CONSTRAINT profile_permissions_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);

-- Permissions

ALTER TABLE public.profile_permissions OWNER TO "admin";
GRANT ALL ON TABLE public.profile_permissions TO "admin";


-- public.seasons definition

-- Drop table

-- DROP TABLE public.seasons;

CREATE TABLE public.seasons (
	id serial4 NOT NULL,
	league_id int4 NOT NULL,
	status varchar(20) DEFAULT 'planned'::character varying NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	flg_default bool DEFAULT false NOT NULL,
	number_of_groups int4 DEFAULT 0 NOT NULL,
	sport_id int4 NOT NULL,
	start_year int4 NOT NULL,
	end_year int4 NOT NULL,
	CONSTRAINT seasons_pkey PRIMARY KEY (id),
	CONSTRAINT seasons_league_id_leagues_id_fk FOREIGN KEY (league_id) REFERENCES public.leagues(id),
	CONSTRAINT seasons_sport_id_sports_id_fk FOREIGN KEY (sport_id) REFERENCES public.sports(id)
);

-- Permissions

ALTER TABLE public.seasons OWNER TO "admin";
GRANT ALL ON TABLE public.seasons TO "admin";


-- public.sport_clubs definition

-- Drop table

-- DROP TABLE public.sport_clubs;

CREATE TABLE public.sport_clubs (
	id serial4 NOT NULL,
	sport_id int4 NOT NULL,
	club_id int4 NOT NULL,
	flg_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT sport_clubs_pkey PRIMARY KEY (id),
	CONSTRAINT sport_clubs_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id),
	CONSTRAINT sport_clubs_sport_id_sports_id_fk FOREIGN KEY (sport_id) REFERENCES public.sports(id)
);

-- Permissions

ALTER TABLE public.sport_clubs OWNER TO "admin";
GRANT ALL ON TABLE public.sport_clubs TO "admin";


-- public.stadiums definition

-- Drop table

-- DROP TABLE public.stadiums;

CREATE TABLE public.stadiums (
	id serial4 NOT NULL,
	"name" varchar(150) NOT NULL,
	city_id int4 NOT NULL,
	capacity int4 NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	image_url text NULL,
	year_constructed int4 NULL,
	"type" varchar(50) NOT NULL,
	CONSTRAINT stadiums_pkey PRIMARY KEY (id),
	CONSTRAINT stadiums_city_id_cities_id_fk FOREIGN KEY (city_id) REFERENCES public.cities(id)
);

-- Permissions

ALTER TABLE public.stadiums OWNER TO "admin";
GRANT ALL ON TABLE public.stadiums TO "admin";


-- public.user_permissions definition

-- Drop table

-- DROP TABLE public.user_permissions;

CREATE TABLE public.user_permissions (
	id serial4 NOT NULL,
	user_id int4 NOT NULL,
	menu_item_id int4 NOT NULL,
	can_access bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT user_permissions_pkey PRIMARY KEY (id),
	CONSTRAINT user_permissions_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id),
	CONSTRAINT user_permissions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Permissions

ALTER TABLE public.user_permissions OWNER TO "admin";
GRANT ALL ON TABLE public.user_permissions TO "admin";


-- public.club_stadiums definition

-- Drop table

-- DROP TABLE public.club_stadiums;

CREATE TABLE public.club_stadiums (
	id serial4 NOT NULL,
	club_id int4 NOT NULL,
	stadium_id int4 NOT NULL,
	start_date timestamp NOT NULL,
	end_date timestamp NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT club_stadiums_pkey PRIMARY KEY (id),
	CONSTRAINT club_stadiums_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id),
	CONSTRAINT club_stadiums_stadium_id_stadiums_id_fk FOREIGN KEY (stadium_id) REFERENCES public.stadiums(id)
);

-- Permissions

ALTER TABLE public.club_stadiums OWNER TO "admin";
GRANT ALL ON TABLE public.club_stadiums TO "admin";


-- public."groups" definition

-- Drop table

-- DROP TABLE public."groups";

CREATE TABLE public."groups" (
	id serial4 NOT NULL,
	"name" varchar(50) NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	season_id int4 NOT NULL,
	CONSTRAINT groups_pkey PRIMARY KEY (id),
	CONSTRAINT groups_season_id_seasons_id_fk FOREIGN KEY (season_id) REFERENCES public.seasons(id)
);

-- Permissions

ALTER TABLE public."groups" OWNER TO "admin";
GRANT ALL ON TABLE public."groups" TO "admin";


-- public.league_links definition

-- Drop table

-- DROP TABLE public.league_links;

CREATE TABLE public.league_links (
	id serial4 NOT NULL,
	league_id int4 NOT NULL,
	"label" varchar(100) NOT NULL,
	url text NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT league_links_pkey PRIMARY KEY (id),
	CONSTRAINT league_links_league_id_leagues_id_fk FOREIGN KEY (league_id) REFERENCES public.leagues(id)
);

-- Permissions

ALTER TABLE public.league_links OWNER TO "admin";
GRANT ALL ON TABLE public.league_links TO "admin";


-- public.rounds definition

-- Drop table

-- DROP TABLE public.rounds;

CREATE TABLE public.rounds (
	id serial4 NOT NULL,
	league_id int4 NOT NULL,
	round_number int4 NOT NULL,
	start_date timestamp NULL,
	end_date timestamp NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	season_id int4 NOT NULL,
	flg_current bool DEFAULT false NOT NULL,
	CONSTRAINT rounds_pkey PRIMARY KEY (id),
	CONSTRAINT rounds_league_id_leagues_id_fk FOREIGN KEY (league_id) REFERENCES public.leagues(id),
	CONSTRAINT rounds_season_id_seasons_id_fk FOREIGN KEY (season_id) REFERENCES public.seasons(id)
);

-- Permissions

ALTER TABLE public.rounds OWNER TO "admin";
GRANT ALL ON TABLE public.rounds TO "admin";


-- public.season_clubs definition

-- Drop table

-- DROP TABLE public.season_clubs;

CREATE TABLE public.season_clubs (
	id serial4 NOT NULL,
	season_id int4 NOT NULL,
	club_id int4 NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	group_id int4 NULL,
	sport_id int4 NOT NULL,
	league_id int4 NOT NULL,
	CONSTRAINT season_clubs_pkey PRIMARY KEY (id),
	CONSTRAINT season_clubs_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id),
	CONSTRAINT season_clubs_group_id_groups_id_fk FOREIGN KEY (group_id) REFERENCES public."groups"(id),
	CONSTRAINT season_clubs_league_id_leagues_id_fk FOREIGN KEY (league_id) REFERENCES public.leagues(id),
	CONSTRAINT season_clubs_season_id_seasons_id_fk FOREIGN KEY (season_id) REFERENCES public.seasons(id),
	CONSTRAINT season_clubs_sport_id_sports_id_fk FOREIGN KEY (sport_id) REFERENCES public.sports(id)
);

-- Permissions

ALTER TABLE public.season_clubs OWNER TO "admin";
GRANT ALL ON TABLE public.season_clubs TO "admin";


-- public.standings definition

-- Drop table

-- DROP TABLE public.standings;

CREATE TABLE public.standings (
	id serial4 NOT NULL,
	group_id int4 NULL,
	club_id int4 NOT NULL,
	points int4 DEFAULT 0 NOT NULL,
	played int4 DEFAULT 0 NOT NULL,
	wins int4 DEFAULT 0 NOT NULL,
	draws int4 DEFAULT 0 NOT NULL,
	losses int4 DEFAULT 0 NOT NULL,
	goals_for int4 DEFAULT 0 NOT NULL,
	goals_against int4 DEFAULT 0 NOT NULL,
	goal_difference int4 DEFAULT 0 NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	league_id int4 NOT NULL,
	season_id int4 NOT NULL,
	round_id int4 NOT NULL,
	league_division_id int4 NULL,
	overtime_wins int4 DEFAULT 0 NULL,
	overtime_losses int4 DEFAULT 0 NULL,
	penalty_wins int4 DEFAULT 0 NULL,
	penalty_losses int4 DEFAULT 0 NULL,
	sets_won int4 DEFAULT 0 NULL,
	sets_lost int4 DEFAULT 0 NULL,
	divisions_won int4 DEFAULT 0 NULL,
	divisions_lost int4 DEFAULT 0 NULL,
	home_games_played int4 DEFAULT 0 NULL,
	away_games_played int4 DEFAULT 0 NULL,
	home_wins int4 DEFAULT 0 NULL,
	home_losses int4 DEFAULT 0 NULL,
	home_draws int4 DEFAULT 0 NULL,
	away_wins int4 DEFAULT 0 NULL,
	away_losses int4 DEFAULT 0 NULL,
	away_draws int4 DEFAULT 0 NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT standings_pkey PRIMARY KEY (id),
	CONSTRAINT standings_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id),
	CONSTRAINT standings_group_id_groups_id_fk FOREIGN KEY (group_id) REFERENCES public."groups"(id),
	CONSTRAINT standings_league_id_leagues_id_fk FOREIGN KEY (league_id) REFERENCES public.leagues(id),
	CONSTRAINT standings_round_id_rounds_id_fk FOREIGN KEY (round_id) REFERENCES public.rounds(id),
	CONSTRAINT standings_season_id_seasons_id_fk FOREIGN KEY (season_id) REFERENCES public.seasons(id)
);

-- Permissions

ALTER TABLE public.standings OWNER TO "admin";
GRANT ALL ON TABLE public.standings TO "admin";


-- public.matches definition

-- Drop table

-- DROP TABLE public.matches;

CREATE TABLE public.matches (
	id serial4 NOT NULL,
	group_id int4 NULL,
	home_club_id int4 NOT NULL,
	away_club_id int4 NOT NULL,
	stadium_id int4 NULL,
	"date" timestamp NOT NULL,
	status varchar(20) DEFAULT 'scheduled'::character varying NOT NULL,
	home_score int4 NULL,
	away_score int4 NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	league_id int4 NOT NULL,
	season_id int4 NOT NULL,
	round_id int4 NULL,
	league_division_id int4 NULL,
	turn int4 DEFAULT 1 NOT NULL,
	has_overtime bool DEFAULT false NULL,
	has_penalties bool DEFAULT false NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	sport_id int4 NOT NULL,
	CONSTRAINT matches_pkey PRIMARY KEY (id),
	CONSTRAINT matches_away_club_id_clubs_id_fk FOREIGN KEY (away_club_id) REFERENCES public.clubs(id),
	CONSTRAINT matches_group_id_groups_id_fk FOREIGN KEY (group_id) REFERENCES public."groups"(id),
	CONSTRAINT matches_home_club_id_clubs_id_fk FOREIGN KEY (home_club_id) REFERENCES public.clubs(id),
	CONSTRAINT matches_league_id_leagues_id_fk FOREIGN KEY (league_id) REFERENCES public.leagues(id),
	CONSTRAINT matches_round_id_rounds_id_fk FOREIGN KEY (round_id) REFERENCES public.rounds(id),
	CONSTRAINT matches_season_id_seasons_id_fk FOREIGN KEY (season_id) REFERENCES public.seasons(id),
	CONSTRAINT matches_sport_id_sports_id_fk FOREIGN KEY (sport_id) REFERENCES public.sports(id),
	CONSTRAINT matches_stadium_id_stadiums_id_fk FOREIGN KEY (stadium_id) REFERENCES public.stadiums(id)
);

-- Permissions

ALTER TABLE public.matches OWNER TO "admin";
GRANT ALL ON TABLE public.matches TO "admin";


-- public.match_divisions definition

-- Drop table

-- DROP TABLE public.match_divisions;

CREATE TABLE public.match_divisions (
	id serial4 NOT NULL,
	match_id int4 NOT NULL,
	division_number int4 NOT NULL,
	home_score int4 DEFAULT 0 NOT NULL,
	away_score int4 DEFAULT 0 NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	division_type varchar(20) NOT NULL,
	CONSTRAINT match_divisions_pkey PRIMARY KEY (id),
	CONSTRAINT match_divisions_match_id_matches_id_fk FOREIGN KEY (match_id) REFERENCES public.matches(id)
);

-- Permissions

ALTER TABLE public.match_divisions OWNER TO "admin";
GRANT ALL ON TABLE public.match_divisions TO "admin";


-- public.match_events definition

-- Drop table

-- DROP TABLE public.match_events;

CREATE TABLE public.match_events (
	id serial4 NOT NULL,
	match_id int4 NOT NULL,
	event_type varchar(50) NOT NULL,
	club_id int4 NOT NULL,
	player_id int4 NULL,
	"minute" int4 NULL,
	description text NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT match_events_pkey PRIMARY KEY (id),
	CONSTRAINT match_events_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id),
	CONSTRAINT match_events_match_id_matches_id_fk FOREIGN KEY (match_id) REFERENCES public.matches(id)
);

-- Permissions

ALTER TABLE public.match_events OWNER TO "admin";
GRANT ALL ON TABLE public.match_events TO "admin";




-- Permissions

GRANT ALL ON SCHEMA public TO pg_database_owner;
GRANT USAGE ON SCHEMA public TO public;