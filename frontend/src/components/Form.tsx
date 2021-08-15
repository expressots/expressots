import { useFormik } from "formik";
import { useState } from "react";
import { api } from "../services/api";
import Input from "./Input";

export const Form: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formik = useFormik({
    initialValues: {
      playerName: "",
    },
    //validationSchema: BACKEND INTEGRATION,
    onSubmit: async (values) => {
      setLoading(true);

      let response = null;
      try {
        response = await api.updatePlayer(values);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
        setError("error");
      }
    },
  });

  return (
    <div className="relative   h-full  w-full ">
      <form
        onSubmit={formik.handleSubmit}
        className="bg-white grid gap-6 shadow-md rounded px-8 pt-6 pb-8 mb-4"
      >
        <Input
          value={formik.values.playerName}
          onBlur={formik.handleBlur}
          label="Player Name"
          onChange={formik.handleChange}
          error={formik.errors.playerName}
          name="playerName"
          touched={formik.touched.playerName}
          id="playerName"
        />
        <Input
          value={formik.values.playerName}
          onBlur={formik.handleBlur}
          label="Player Name"
          onChange={formik.handleChange}
          error={formik.errors.playerName}
          name="playerName"
          touched={formik.touched.playerName}
          id="playerName"
        />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          type="button"
        >
          Sign In
        </button>
      </form>
    </div>
  );
};
