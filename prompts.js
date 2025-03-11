const prompts = [
  "Thoroughly analyze this entire screenshot. FIRST, identify any programming question, problem statement, or coding challenge present in the image (it could be anywhere in the image). THEN: 1) Provide a direct, properly formatted solution to the identified question. 2) Give a step-by-step explanation with numbered points, each being brief and focused on one concept - ideal for interview explanations.",

  "Carefully examine this ENTIRE screenshot to find ANY programming question or problem statement (which could be located ANYWHERE in the image). Once identified: 1) Provide a properly formatted solution specific to that problem. 2) Then give a concise, numbered step-by-step explanation that someone could quickly reference during an interview.",
  
  "Search this ENTIRE image carefully to locate ANY programming question, coding challenge, or technical problem (it could appear ANYWHERE in the screenshot). Once found: ANSWER: [Provide a direct, well-formatted solution for the specific question] EXPLANATION: [Give a numbered step-by-step breakdown, each step being a brief point that could be quickly referenced in an interview]",
  
  "Scan this COMPLETE screenshot to identify ANY programming question or technical problem (it could be positioned ANYWHERE in the image - top, bottom, left, right, center). Once found: 1) First write a properly formatted solution specific to that question. 2) Then provide numbered steps explaining your approach, with each step being a short, scannable point - ideal for interview preparation.",
  
  "FIRST, thoroughly analyze this screenshot to find ANY technical question or programming challenge (it could be in ANY location within the image). After identifying the problem: 1) Provide a properly formatted solution following language-specific conventions. 2) Give a numbered, step-by-step explanation with each step being extremely brief - designed to be referenced during an interview.",
  
  "Look at this ENTIRE screenshot and identify ANY programming question or coding challenge visible in the image (it could appear ANYWHERE). Once identified: SOLUTION: [Provide properly formatted code that specifically answers the identified question] WALKTHROUGH: [Break down your solution into numbered steps, each being a concise point that someone could quickly reference while explaining to an interviewer]",
  
  "Carefully examine every part of this screenshot to find ANY programming problem, coding question, or technical challenge (it could be located ANYWHERE in the image). Once found: 1) Provide a properly formatted solution to that specific problem. 2) Then give a series of numbered, extremely concise explanation steps - each focusing on just one aspect of your solution that would be helpful for interview explanations.",
  
  "FIRST PRIORITY: Thoroughly scan this ENTIRE screenshot to identify ANY programming question or technical problem (it could be positioned ANYWHERE in the image). After locating the question: 1) Provide a correctly formatted solution specific to that problem. 2) Give a numbered list of explanation points, each being very brief - designed to help someone explain their approach step by step in an interview.",
  
  "Examine this COMPLETE screenshot to locate ANY technical question, coding challenge, algorithm problem, or programming task (it could be in ANY part of the image). After identifying it: 1) Provide a properly formatted solution specific to that problem. 2) Then create a step-by-step explanation with each step numbered and extremely concise - perfect for quick reference during an interview explanation.",
  
  "Your FIRST task is to thoroughly analyze this ENTIRE screenshot to identify ANY programming question or technical problem (it could be located ANYWHERE in the image). Once found: ANSWER: [Provide a well-formatted solution that addresses the specific problem identified] EXPLANATION: [Number each step (Step 1, Step 2...) and make each step extremely concise - designed as quick reference points for interview explanations]"
];

function getRandomPrompt() {
  const randomIndex = Math.floor(Math.random() * prompts.length);
  return prompts[randomIndex];
}

module.exports = {
  getRandomPrompt
};