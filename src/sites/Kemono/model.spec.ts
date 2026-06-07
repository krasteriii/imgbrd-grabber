import { search, makeGrabber } from "../test-utils";
import { source } from "./model";

describe("Kemono", () => {
    beforeAll(makeGrabber);

    describe("JSON API", () => {
        describe("Search", () => {
            it("builds a full-text search URL for a normal query", () => {
                expect(search(source.apis.json, "naruto", 1)).toEqual({
                    url: "/api/v1/posts?limit=10&o=0&q=naruto",
                    headers: { "Accept": "text/css" },
                });
            });

            it("does not treat a bare 'user:<id>' as the special browsing syntax", () => {
                // Kemono has no server-side ID -> service lookup, so a service prefix is required
                expect(search(source.apis.json, "user:2556153", 1)).toEqual({
                    url: "/api/v1/posts?limit=10&o=0&q=user%3A2556153",
                    headers: { "Accept": "text/css" },
                });
            });

            it("builds a creator browsing URL for the 'user:<service>:<id>' syntax", () => {
                expect(search(source.apis.json, "user:patreon:2556153", 1)).toEqual({
                    url: "/api/v1/patreon/user/2556153/posts?o=0",
                    headers: { "Accept": "text/css" },
                });
            });

            it("paginates the creator browsing URL using the offset", () => {
                expect(search(source.apis.json, "user:patreon:2556153", 2)).toEqual({
                    url: "/api/v1/patreon/user/2556153/posts?o=10",
                    headers: { "Accept": "text/css" },
                });
            });

            it("parses a wrapped full-text search response", () => {
                const src = JSON.stringify({
                    posts: [
                        { id: "1", user: "2556153", service: "patreon", title: "Post 1", published: "2024-01-01T00:00:00", file: { path: "/data/aa/1.jpg" }, attachments: [] },
                        { id: "2", user: "2556153", service: "patreon", title: "Post 2", published: "2024-01-02T00:00:00", file: { path: "/data/aa/2.jpg" }, attachments: [] },
                    ],
                    count: 2,
                    true_count: 25,
                });
                const res = source.apis.json.search.parse(src, 200) as IParsedSearch;

                expect(res.images.length).toEqual(2);
                expect(res.imageCount).toEqual(25);
                expect(res.images.map((i: any) => i.id)).toEqual(["1", "2"]);
            });

            it("parses a bare array response from the creator browsing endpoint", () => {
                const src = JSON.stringify([
                    { id: "1", user: "2556153", service: "patreon", title: "Post 1", published: "2024-01-01T00:00:00", file: { path: "/data/aa/1.jpg" }, attachments: [] },
                    { id: "2", user: "2556153", service: "patreon", title: "Post 2", published: "2024-01-02T00:00:00", file: { path: "/data/aa/2.jpg" }, attachments: [] },
                    { id: "3", user: "2556153", service: "patreon", title: "Post 3", published: "2024-01-03T00:00:00", file: { path: "/data/aa/3.jpg" }, attachments: [] },
                ]);
                const res = source.apis.json.search.parse(src, 200) as IParsedSearch;

                expect(res.images.length).toEqual(3);
                expect(res.imageCount).toBeUndefined();
                expect(res.images.map((i: any) => i.identity)).toEqual([
                    { service: "patreon", user: "2556153", id: "1" },
                    { service: "patreon", user: "2556153", id: "2" },
                    { service: "patreon", user: "2556153", id: "3" },
                ]);
            });
        });

        describe("Gallery", () => {
            it("builds the URL from the post's identity", () => {
                const identity = { service: "patreon", user: "2556153", id: "142844621" };
                const req = source.apis.json.gallery!.url(
                    { id: "142844621", md5: "", page: 1, identity },
                    { page: 1, limit: 10, loggedIn: false, baseUrl: "/" },
                );

                expect(req).toEqual({
                    url: "/api/v1/patreon/user/2556153/post/142844621",
                    headers: { "Accept": "text/css" },
                });
            });

            it("parses the response into one image per attachment", () => {
                const src = JSON.stringify({
                    post: {
                        id: "142844621",
                        user: "2556153",
                        service: "patreon",
                        title: "Akuma + Process (AND UPDATE)",
                        published: "2024-01-01T00:00:00",
                        file: { path: "/data/aa/main.jpg" },
                        attachments: [
                            { path: "/data/aa/1.jpg" },
                            { path: "/data/aa/2.jpg" },
                        ],
                    },
                });
                const res = source.apis.json.gallery!.parse(src, 200) as IParsedGallery;

                expect(res.images.length).toEqual(2);
                expect(res.imageCount).toEqual(2);
                expect(res.pageCount).toEqual(1);
                expect(res.images.map((i: any) => i.file_url)).toEqual(["/data/aa/1.jpg", "/data/aa/2.jpg"]);
                expect(res.images.map((i: any) => i.preview_url)).toEqual(["/thumbnail/data/aa/1.jpg", "/thumbnail/data/aa/2.jpg"]);
                expect(res.images.every((i: any) => i.type === "image")).toEqual(true);
            });
        });

        describe("Check", () => {
            it("returns the root", () => {
                expect(source.apis.json.check!.url()).toEqual("/");
            });

            it("returns true when the page contains the Kemono logo", () => {
                expect(source.apis.json.check!.parse("<html><img src=\"/kemono-logo.svg\"></html>", 200)).toEqual(true);
            });

            it("returns false for an unrelated page", () => {
                expect(source.apis.json.check!.parse("<html><body>Not Kemono</body></html>", 200)).toEqual(false);
            });
        });
    });
});
