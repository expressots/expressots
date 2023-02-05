import React, { FC } from "react";
import { render } from "ink";
import { FormProps, Form } from "ink-form";

interface CreateProjectProps {
	projectName?: string;
}

type FormBuilder = (args: CreateProjectProps) => FormProps;

const form: FormBuilder = ({ projectName }) => ({
	form: {
		title: "Create a new Expresso TS project",
		sections: [
			{
				title: "Project settings",
				fields: [
					{
						type: "string",
						name: "projectName",
						label: "Project name",
						initialValue: projectName ?? "",
					},
					{
						type: "select",
						name: "projectType",
						label: "Project type",
						initialValue: "barebones",
						options: [
							{ label: "Barebones", value: "barebones" },
							{ label: "JWT auth", value: "jwt" },
							{ label: "OAuth2 auth", value: "oauth2" },
							{ label: "MongoDB", value: "mongo" },
							{ label: "Microservices", value: "microservices" },
						],
					},
				],
			},
		],
	},
});

const App: FC<CreateProjectProps> = ({ projectName }) => (
	<Form
		{...form({ projectName })}
		onSubmit={(result) => {
			console.log(`Finished with value`, result);
		}}
	/>
);

export const ProjectUIForm: (args: CreateProjectProps) => void = ({
	projectName,
}) => {
	render(<App projectName={projectName} />);
};
