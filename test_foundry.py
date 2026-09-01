from azure_foundry_openai import ask


def main() -> None:
	response = ask("What is the capital of France?")
	print(f"Answer: {response}")


if __name__ == "__main__":
	main()
