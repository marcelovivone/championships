-- Geography Tables
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    continent VARCHAR(20) CHECK (continent IN ('Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America')) NOT NULL
);

CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country_id INTEGER REFERENCES countries(id) NOT NULL
);

-- Organization Tables
CREATE TABLE clubs (
    id SERIAL PRIMARY KEY,
    foundation_year INTEGER,
    country_id INTEGER REFERENCES countries(id) NOT NULL,
    logo_url TEXT
);

-- Temporal Stadium association
CREATE TABLE stadiums (
    id SERIAL PRIMARY KEY,
    club_id INTEGER REFERENCES clubs(id) NOT NULL,
    name VARCHAR(100),
    capacity INTEGER,
    construction_year INTEGER,
    city_id INTEGER REFERENCES cities(id),
    start_date DATE,
    end_date DATE
);

-- Personnel (Players and Coaches)
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    nationality_id INTEGER REFERENCES countries(id),
    birth_city_id INTEGER REFERENCES cities(id),
    is_coach BOOLEAN DEFAULT FALSE,
    is_player BOOLEAN DEFAULT TRUE
);

-- Temporal Club Association for Members
CREATE TABLE club_assignments (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(id) NOT NULL,
    club_id INTEGER REFERENCES clubs(id),
    start_date DATE NOT NULL,
    end_date DATE,
    CONSTRAINT no_overlap UNIQUE (member_id, start_date)
);

-- League and Sub-League (Infinite nesting logic)
CREATE TABLE leagues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sport_type VARCHAR(50) NOT NULL,
    country_id INTEGER REFERENCES countries(id),
    city_id INTEGER REFERENCES cities(id),
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    parent_league_id INTEGER REFERENCES leagues(id) -- Supports Conferences/Sub-leagues
);