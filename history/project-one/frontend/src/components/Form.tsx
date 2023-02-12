import { useFormik } from "formik";
import { useState } from "react";
import Input from "./Input";
import {
  createPlayerSchema,
  ICreatePlayerDTO,
} from "../services/api/player/createPlayer.dto";
import api from "../services/api";
import classNames from "classnames";

export const Form: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSucess] = useState(false);

  const buttonClassNames = classNames({
    " pointer-events-none": loading,
  });

  const formik = useFormik<ICreatePlayerDTO>({
    initialValues: {
      email: "",
      name: "",
      faction: "",
    },
    validationSchema: createPlayerSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        debugger;
        await api.player.create(values);
        setSucess(true);
        setLoading(false);
      } catch (error) {
        setLoading(false);
        setError(
          "Sorry, something went wrong. Please try again or contact system administrator"
        );
      }
    },
  });

  return (
    <div className="relative   h-full  w-full ">
      {error && (
        <div className="border bg-red-300 border-red-600 p-8 text-red-900">
          {error}
        </div>
      )}

      {success && (
        <div className="border bg-green-300 border-green-700 p-8 text-green-900">
          Player sucessfully created
        </div>
      )}
      {!success && (
        <form
          onSubmit={formik.handleSubmit}
          className="bg-white grid gap-6 shadow-md rounded px-8 pt-6 pb-8 mb-4"
        >
          <Input
            value={formik.values.name}
            onBlur={formik.handleBlur}
            label="Name"
            onChange={formik.handleChange}
            error={formik.errors.name}
            name="name"
            touched={formik.touched.name}
            id="playerName"
          />
          <Input
            value={formik.values.email}
            onBlur={formik.handleBlur}
            label="Email"
            onChange={formik.handleChange}
            error={formik.errors.email}
            name="email"
            touched={formik.touched.email}
            id="email"
          />
          <Input
            value={formik.values.faction}
            onBlur={formik.handleBlur}
            label="Faction"
            onChange={formik.handleChange}
            error={formik.errors.faction}
            name="faction"
            touched={formik.touched.faction}
            id="faction"
          />
          <button
            className={`${buttonClassNames} bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
            type="submit"
          >
            {loading && <>Loading...</>}
            {!loading && <>Save</>}
          </button>
        </form>
      )}
    </div>
  );
};
