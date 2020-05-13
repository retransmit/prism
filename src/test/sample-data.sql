INSERT INTO "user"(
	"id",
	"name",
	"timestamp"
)
	VALUES (
		'jeswin',
		'Jeswin Kumar',
		1559302695646
	);

INSERT INTO "local_user_auth"(
	"user_id",
	"hash",
	"salt",
	"algorithm",
	"timestamp"
)
	VALUES (
		'jeswin',
		'some_hash',
		'some_salt',
		'sha256',
		1559302695646
	);

INSERT INTO "user"(
	"id",
	"name",
	"timestamp"
)
	VALUES (
		'eddie',
		'Eddie Noname',
		1559302695646
	);

INSERT INTO "provider_user"(
	"user_id",
	"provider_user_id",
	"provider",
	"timestamp"
)
	VALUES (
		'jeswin',
		'jeswin',
		'github',
		1559302695646
	);

INSERT INTO "provider_user"(
	"user_id",
	"provider_user_id",
	"provider",
	"timestamp"
)
	VALUES (
		'eddie',
		'eddiedoesntexist',
		'github',
		1559302695646
	);

INSERT INTO "role"(
	"name",
	"timestamp"
)
	VALUES (
		'coreteam',
		1559302695646
	);
	
INSERT INTO "role"(
	"name",
	"timestamp"
)
	VALUES (
		'admin',
		1559302695646
	);
	
INSERT INTO "user_role"(
	"role_name",
	"user_id",
	"timestamp"
)
	VALUES (
		'coreteam',
		'jeswin',
		1559302695646
	);

INSERT INTO "user_role"(
	"role_name",
	"user_id",
	"timestamp"
	)
	VALUES (
		'admin',
		'jeswin',
		1559302695646
	);

INSERT INTO "user_role"(
	"role_name",
	"user_id",
	"timestamp"
)
	VALUES (
		'admin',
		'eddie',
		1559302695646
	);

INSERT INTO "user_token"(
	"name",
	"user_id",
	"value",
	"timestamp"
)
	VALUES (
		'full',
		'jeswin',
		'yes',
		1559302695646
	);
	
INSERT INTO "role_token"(
	"name",
	"role_name",
	"value",
	"timestamp"
)
	VALUES (
		'dashboard',
		'admin',
		'yes',
		1559302695646
	);

INSERT INTO "kvstore"(
	"user_id",
	"key",
	"value",
	"tag",
	"timestamp"
)
	VALUES (
		'jeswin',
		'group',
		'admin',
		'rights',
		1559302695646
	);