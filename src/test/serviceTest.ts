import pg = require("pg");
import { startApp } from "..";
import request = require("supertest");
import { IDbConfig } from "psychopiggy";

let app: any;

export default function run(
  dbConfig: IDbConfig,
  port: number,
  configDir: string
) {
  describe("service", async () => {
    let app: any;

    before(async () => {
      const service = await startApp(port, configDir);
      app = service.listen();
    });

    it("says userid exists", async () => {
      const pool = new pg.Pool(dbConfig);
      await pool.query(`
        INSERT INTO "user"
          (id, name, timestamp)
          VALUES('jeswin', 'Jeswin Kumar', ${Date.now()});
      `);
      const response = await request(app).get("/user-ids/jeswin");
      response.status.should.equal(200);
      JSON.parse(response.text).should.deepEqual({
        exists: true,
      });
    });

    it("says missing userid is missing", async () => {
      const response = await request(app).get("/user-ids/alice");
      response.status.should.equal(200);
      JSON.parse(response.text).should.deepEqual({
        exists: false,
      });
    });

    it("redirects to connect", async () => {
      const response = await request(app).get(
        "/authenticate/github?success=http://test.example.com/success&newuser=http://test.example.com/newuser"
      );
      response.header["set-cookie"].should.containEql(
        "border-patrol-success-redirect=http://test.example.com/success; path=/; domain=test.example.com"
      );
      response.header["set-cookie"].should.containEql(
        "border-patrol-newuser-redirect=http://test.example.com/newuser; path=/; domain=test.example.com"
      );
      response.text.should.equal(
        `Redirecting to <a href="/connect/github">/connect/github</a>.`
      );
    });

    it("creates a user", async () => {
      const response = await request(app)
        .post("/users")
        .send({ userId: "jeswin" })
        .set("border-patrol-jwt", "some_jwt");

      const cookies = (response.header["set-cookie"] as Array<
        string
      >).flatMap((x) => x.split(";"));
      cookies.should.containEql("border-patrol-jwt=some_other_jwt");
      cookies.should.containEql("border-patrol-domain=test.example.com");
      response.text.should.equal(
        `{"border-patrol-jwt":"some_other_jwt","border-patrol-user-id":"jeswin","border-patrol-domain":"test.example.com"}`
      );
    });
  });
}
