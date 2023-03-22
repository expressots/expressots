import { XButton, XInput, XPage } from "@/components";
import i18n from "@/i18n";
import { router } from "@/router";
import { useMovieStore } from "@/stores";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { VueWrapper, config, flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import waitForExpect from "wait-for-expect";
import CreateView from "./CreateView.vue";

config.global.plugins = [i18n];

config.global.components = {
  XPage,
  XButton,
  FontAwesomeIcon,
  XInput,
};

library.add(fab, fas, far);

const ELEMENTS = {
  TITLE_INPUT: "input#title",
  YEAR_INPUT: "input#year",
  GENRE_INPUT: "input#genre",
  SUBMIT_BUTTON: "button[data-test=update]",
};

describe("CreateView", () => {
  let wrapper: VueWrapper<InstanceType<typeof CreateView>>;

  beforeEach(() => {
    wrapper = mount(CreateView, {
      global: {
        plugins: [createPinia(), router],
      },
    });
  });

  afterEach(() => wrapper.unmount());

  it("should create user successfully", async () => {
    const movieStore = useMovieStore();

    const title = wrapper.find<HTMLInputElement>(ELEMENTS.TITLE_INPUT);
    const year = wrapper.find<HTMLInputElement>(ELEMENTS.YEAR_INPUT);
    const genre = wrapper.find<HTMLInputElement>(ELEMENTS.GENRE_INPUT);

    title.setValue("test");
    year.setValue(2020);
    genre.setValue("Action");

    await wrapper.find(ELEMENTS.SUBMIT_BUTTON).trigger("submit");

    expect(title.element.value).toBe("test");
    expect(year.element.value).toEqual(2020);
    expect(genre.element.value).toBe("Action");

    await flushPromises();

    await waitForExpect(() => {
      expect(movieStore.movies.length).toBe(1);
      expect(movieStore.movies[0].title).toBe("test");
      expect(movieStore.movies[0].year).toBe(2020);
      expect(movieStore.movies[0].genre).toBe("Action");
    });
  });

  it("should not create user with empty fields", async () => {
    const movieStore = useMovieStore();

    const title = wrapper.find<HTMLInputElement>(ELEMENTS.TITLE_INPUT);
    const year = wrapper.find<HTMLInputElement>(ELEMENTS.YEAR_INPUT);
    const genre = wrapper.find<HTMLInputElement>(ELEMENTS.GENRE_INPUT);

    title.setValue("");
    year.setValue("");
    genre.setValue("");

    await wrapper.find(ELEMENTS.SUBMIT_BUTTON).trigger("submit");

    expect(title.element.value).toBe("");
    expect(year.element.value).toBe("");
    expect(genre.element.value).toBe("");

    await flushPromises();

    await waitForExpect(() => {
      expect(title.element.nextSibling?.textContent).toBe(
        "Title is a required field"
      );
      expect(year.element.nextSibling?.textContent).toBe("Year is invalid");
      expect(genre.element.nextSibling?.textContent).toBe(
        "Genre is a required field"
      );
      expect(movieStore.movies.length).toBe(0);
    });
  });

  it("should not create user with invalid year", async () => {
    const movieStore = useMovieStore();

    const title = wrapper.find<HTMLInputElement>(ELEMENTS.TITLE_INPUT);
    const year = wrapper.find<HTMLInputElement>(ELEMENTS.YEAR_INPUT);
    const genre = wrapper.find<HTMLInputElement>(ELEMENTS.GENRE_INPUT);

    title.setValue("Avengers");
    year.setValue("0");
    genre.setValue("Action");

    await wrapper.find(ELEMENTS.SUBMIT_BUTTON).trigger("submit");

    expect(title.element.value).toBe("Avengers");
    expect(year.element.value).toBe("0");
    expect(genre.element.value).toBe("Action");

    await flushPromises();

    await waitForExpect(() => {
      expect(year.element.nextSibling?.textContent).toBe("Year is invalid");
      expect(movieStore.movies.length).toBe(0);
    });
  });
});
