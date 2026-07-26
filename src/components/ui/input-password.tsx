"use client";

import * as React from "react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "./input-group";
import { EyeClosedIcon, EyeIcon } from "lucide-react";

function InputPassword({ ...props }: React.ComponentProps<"input">) {
  const [isView, setIsView] = React.useState<boolean>(false);
  const id = React.useId();

  const toogleView = () => setIsView((prevState) => !prevState);

  return (
    <InputGroup>
      <InputGroupInput
        {...props}
        type={isView ? "text" : "password"}
        id={props.id || id}
      />

      <InputGroupAddon
        role="button"
        tabIndex={0}
        align="inline-end"
        className="cursor-pointer"
        onClick={toogleView}
        aria-label={isView ? "Hide password" : "Show password"}
        aria-pressed={isView}
        aria-controls={props.id || id}
      >
        {isView ? <EyeClosedIcon /> : <EyeIcon />}
      </InputGroupAddon>
    </InputGroup>
  );
}

export { InputPassword };
