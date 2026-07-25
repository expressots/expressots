import { XButton, XInput, XPage } from "@/components";
import { ROUTE_NAMES } from "@/enums";
import i18n from "@/i18n";
import { router } from "@/router";
import type { IMovie } from "@/types";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { createTestingPinia } from "@pinia/testing";
import { config, flushPromises, mount, VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import waitForExpect from "wait-for-expect";
import UpdateView from "./UpdateView.vue";

vi.mock("@/services/movie.service.ts", () => ({
  default: {
    update: vi.fn(),
  },
}));

config.global.plugins = [i18n];

config.global.components = {
  XPage,
  XInput,
  XButton,
  FontAwesomeIcon,
};

library.add(fab, fas, far);

const ELEMENTS = {
  TITLE_INPUT: "input#title",
  YEAR_INPUT: "input#year",
  GENRE_INPUT: "input#genre",
  UPDATE_BUTTON: "button[data-test=update]",
};

const movie: IMovie = {
  id: 1,
  title: "Real Steel",
  year: 2011,
  genre: "Action",
};

describe("UpdateView", () => {
  let wrapper: VueWrapper<InstanceType<typeof UpdateView>>;

  beforeEach(async () => {
    vi.resetAllMocks();

    // TODO
    // // Mock AlbumUser list
    // (<Mock>MovieService.update).mockImplementation(() =>
    //   Promise.resolve({
    //     data: ALBUMS_MOCK,
    //     headers: DEFAULT_META,
    //   })
    // );

    const pinia = createTestingPinia({
      stubActions: false,
      initialState: {
        movie: { movies: [movie] },
      },
    });

    await router.push({
      name: ROUTE_NAMES.MOVIE_UPDATE,
      params: { id: movie.id },
    });

    wrapper = mount(UpdateView, {
      global: { plugins: [pinia, router] },
    });
  });

  afterEach(() => wrapper.unmount());

  it("should render successfully", async () => {
    const title = wrapper.find<HTMLInputElement>(ELEMENTS.TITLE_INPUT);
    const year = wrapper.find<HTMLInputElement>(ELEMENTS.YEAR_INPUT);
    const genre = wrapper.find<HTMLInputElement>(ELEMENTS.GENRE_INPUT);
    const updateButton = wrapper.find(ELEMENTS.UPDATE_BUTTON);

    expect(title.exists()).toBe(true);
    expect(year.exists()).toBe(true);
    expect(genre.exists()).toBe(true);
    expect(updateButton.exists()).toBe(true);

    expect(title.element.value).toBe(movie.title);
    expect(year.element.value).toBe(movie.year);
    expect(genre.element.value).toBe(movie.genre);
  });

  it("should update movie title", async () => {
    const title = wrapper.find<HTMLInputElement>(ELEMENTS.TITLE_INPUT);
    const updateButton = wrapper.find(ELEMENTS.UPDATE_BUTTON);

    await title.setValue("Avengers");
    expect(title.element.value).toBe("Avengers");

    await updateButton.trigger("submit");

    await flushPromises();

    await waitForExpect(() => {
      // TODO test if update endpoint is called once
      // TODO test if router.push is called once

      // no errors
      wrapper.findAll("small").forEach((el) => expect(el.text()).empty);
    });
  });
});
