import classNames from "classnames";
import { ChangeEvent } from "react";

interface TextInputProps {
  id: string;
  name: string;
  error?: string;
  label: string;
  touched: boolean | undefined;
  value: string;
  onBlur: (input: ChangeEvent<HTMLInputElement>) => any;
  onChange: (input: ChangeEvent<HTMLInputElement>) => any;
}

const Input: React.FC<TextInputProps> = (props) => {
  const classes = classNames(
    "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline",
    {
      "border-2  border-red-600": props.error && props.touched,
    }
  );
  return (
    <>
      <div className="">
        <label className="lock text-gray-700 text-sm font-bold mb-2">
          {props.label}
        </label>
        <input
          className={classes}
          id={props.id}
          value={props.value}
          name={props.name}
          onBlur={props.onBlur}
          onChange={props.onChange}
          type={"text"}
        />
        {props.error && props.touched && (
          <span className="self-start text-left text-red-500">
            {props.error}
          </span>
        )}
      </div>
    </>
  );
};

export default Input;
