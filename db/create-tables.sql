CREATE TABLE "user" (
    "id" character varying (64) NOT NULL,
    "name" character varying (128) NOT NULL,
    "timestamp" bigint NOT NULL,
    CONSTRAINT "user_pkey" 
        PRIMARY KEY ("id"));

CREATE TABLE "local_user_auth" (
    "user_id" character varying (64) NOT NULL,
    "hash" character varying (256) NOT NULL,
    "salt" character varying (256) NOT NULL,
    "algorithm" character varying (32) NOT NULL,
    "timestamp" bigint NOT NULL,
    CONSTRAINT "local_user_auth_pkey" 
        PRIMARY KEY ("user_id"),
    CONSTRAINT "user_auth_user_id_fkey" 
        FOREIGN KEY ("user_id") 
        REFERENCES "user" ("id"));

CREATE TABLE "provider_user" (
    "user_id" character varying (64) NOT NULL,
    "provider_user_id" character varying (128) NOT NULL,
    "provider" character varying (64) NOT NULL,
    "timestamp" bigint NOT NULL,
    CONSTRAINT "provider_user_pkey" 
        PRIMARY KEY ("provider_user_id", "provider"),
    CONSTRAINT "provider_user_user_id_fkey" 
        FOREIGN KEY ("user_id") 
        REFERENCES "user" ("id"));

CREATE TABLE "user_token" (
    "user_id" character varying (64) NOT NULL,
    "name" character varying (128) NOT NULL,
    "value" character varying (128) NOT NULL,
    "timestamp" bigint NOT NULL,
    CONSTRAINT "user_token_pkey" 
        PRIMARY KEY ("name", "user_id"),
    CONSTRAINT "user_token_user_id_fkey" 
        FOREIGN KEY ("user_id") 
        REFERENCES "user" ("id"));

CREATE TABLE "role" (
    "name" character varying (64) NOT NULL,
    "description" character varying (512),
    "timestamp" bigint NOT NULL,
    CONSTRAINT "role_pkey" 
        PRIMARY KEY ("name"));

CREATE TABLE "role_token" (
    "name" character varying (256) NOT NULL,
    "role_name" character varying (64) NOT NULL,
    "value" character varying (64) NOT NULL,
    "timestamp" bigint NOT NULL,
    CONSTRAINT "role_token_pkey" 
        PRIMARY KEY ("name", "role_name"),
    CONSTRAINT "role_token_role_name_fkey" 
        FOREIGN KEY ("role_name") 
        REFERENCES "role" ("name"));

CREATE TABLE "user_role" (
    "user_id" character varying (64) NOT NULL,
    "role_name" character varying (64) NOT NULL,
    "timestamp" bigint NOT NULL,
    CONSTRAINT "user_role_pkey" 
        PRIMARY KEY ("role_name", "user_id"),
    CONSTRAINT "user_role_role_name_fkey" 
        FOREIGN KEY ("role_name") 
        REFERENCES "role" ("name"),
    CONSTRAINT "user_role_user_id_fkey" 
        FOREIGN KEY ("user_id") 
        REFERENCES "user" ("id"));

CREATE TABLE "kvstore" (
    "user_id" character varying (64) NOT NULL,
    "key" character varying (128) NOT NULL,
    "value" character varying (1024) NOT NULL,
    "tag" character varying (128) NOT NULL,
    "timestamp" bigint NOT NULL,
    CONSTRAINT "kvstore_pkey" 
        PRIMARY KEY ("user_id", "key"));

CREATE INDEX "idx_kvstore_user_id_tag" 
    ON kvstore("user_id", "tag");
