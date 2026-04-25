/**
 * Snapshot tests for the codegen templates shipped under
 * `src/generate/templates/{opinionated,nonopinionated}`. We render the
 * templates with a stable input set (no I/O) and snapshot the output so
 * accidental edits to the .tpl files surface in PR diffs.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "mustache";

const TEMPLATES_DIR = resolve(
	__dirname,
	"..",
	"..",
	"src",
	"generate",
	"templates",
);

function renderTpl(rel: string, data: Record<string, string>): string {
	const abs = resolve(TEMPLATES_DIR, rel);
	const tpl = readFileSync(abs, "utf8");
	return render(tpl, data);
}

const data = {
	className: "User",
	fileName: "user",
	route: "user",
	useCase: "user",
};

describe("generate templates", () => {
	describe("opinionated", () => {
		it("renders dto.tpl", () => {
			expect(renderTpl("opinionated/dto.tpl", data)).toMatchSnapshot();
		});

		it("renders usecase.tpl", () => {
			expect(renderTpl("opinionated/usecase.tpl", data)).toMatchSnapshot();
		});

		it("renders controller-service-get.tpl", () => {
			expect(
				renderTpl("opinionated/controller-service-get.tpl", data),
			).toMatchSnapshot();
		});

		it("renders controller-service-post.tpl", () => {
			expect(
				renderTpl("opinionated/controller-service-post.tpl", data),
			).toMatchSnapshot();
		});

		it("renders middleware.tpl", () => {
			expect(renderTpl("opinionated/middleware.tpl", data)).toMatchSnapshot();
		});

		it("renders provider.tpl", () => {
			expect(renderTpl("opinionated/provider.tpl", data)).toMatchSnapshot();
		});

		it("renders interceptor.tpl (v4)", () => {
			expect(renderTpl("opinionated/interceptor.tpl", data)).toMatchSnapshot();
		});

		it("renders guard.tpl (v4)", () => {
			expect(renderTpl("opinionated/guard.tpl", data)).toMatchSnapshot();
		});

		it("renders event.tpl (v4)", () => {
			expect(renderTpl("opinionated/event.tpl", data)).toMatchSnapshot();
		});

		it("renders handler.tpl (v4)", () => {
			expect(renderTpl("opinionated/handler.tpl", data)).toMatchSnapshot();
		});

		it("renders config.tpl (v4)", () => {
			expect(renderTpl("opinionated/config.tpl", data)).toMatchSnapshot();
		});
	});

	describe("nonopinionated", () => {
		it("renders dto.tpl", () => {
			expect(renderTpl("nonopinionated/dto.tpl", data)).toMatchSnapshot();
		});

		it("renders controller.tpl", () => {
			expect(renderTpl("nonopinionated/controller.tpl", data)).toMatchSnapshot();
		});

		it("renders usecase.tpl", () => {
			expect(renderTpl("nonopinionated/usecase.tpl", data)).toMatchSnapshot();
		});
	});
});
