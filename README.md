# Team Name: The Big Jumbowski (JumBuddy)

The Goal of JumBuddy is to create a program that is capable of aiding Computer
Science instructors by creating a program that is able to accurately show the
process of each student as they create their projects. JumBuddy is able to
calculate the total amount of time spent on the project, the time spent in
individual functions, giving a replay of student implementation of their code,
and an AI overview of each student.

## Our Team

**Harry Lynch**, Product Manager, Handled schema design, server architecture and
orchestration with both frontend interfaces (vscode and web)

**Seth Lupo**, Lead Engineer, Python Server and Database

**Emilio Aleman**. Frontend Lead, Worked on the website and information
technology, and designed the platform logo.

**Max Sharf** - Non-Technical Lead, Handled most non-coded functionalities,
including FAQ, Product Information, and this README.

**Brandon Grazianai**, Frontend Engineer.

**James Overholt**, Backend Engineer, Worked with the visual studio code
extension

## Acknowledgements

Here are the major areas of our project and dependencies/resources used in
development:

**VSCode Extension (Typescript)**: npm diff, generic VSCode extensions
(https://code.visualstudio.com/api)

**Web App (Typescript)**: React, Tailwind CSS, Vite, PrismJS, Diff, Supabase

**Server (Python)** Flask, Supabase, dotenv, PyYaml, pyjwt, Pytest, Requests,
OpenAI GPT 4.0 for LLM Prompting

**Database (PGSql/Supbase)** PostgreSQL, Supabase Claude Code was used in most
places in this codebase.

## Optional Reflection:

1.  Because we love learning, tell us about what you learned this weekend! What
    motivated your team to choose this project? Are there bigger ideas or
    features for the project that you’d want to implement in the future?

    We were motivated by the gap between CS instructors and fully understanding
    students’ struggles with assignments. Currently, CS instructors only see
    final code submissions, not the coding process. In terms of future additions
    to JumBuddy, deploying to cloud and reading students’ commands in the
    terminal would allow instructors to receive even more insight into students’
    coding process.

2.  Tell us about a tricky bug, a design challenge, or that you encountered. How
    did your team tackle it together?

    A tricky design challenge we ran into was how we handled effectively rolling
    our own version control in order to seamlessly and reasonably (from a
    memory/computational point of view). We solved this by taking incremental
    diffs of the currently edited file and storing that on our database, with an
    initial diff to handle boilerplate code that the file was pulled with. With
    this design and the help of diff libraries and clever logic, we were able to
    comprehensively rebuilt edits from pull to current state (and anywhere
    inbetween) with animations that make it look as though the file is being
    written in front of your eyes. This manifested itself on our web interface
    with a video-like interface to scrub through edit history for each student’s
    files.

3.  Tell us about one fun or interesting experience that you had with other
    hackers! Did you get coffee with new friends? Did you attend a workshop that
    inspired you? Did you meet someone new?

    The whole process of brainstorming ideas that fit along tracks. The walls of
    JCC 302, are still littered with our ideas. From Highway Camera may, to Home
    Network Sniffer, ideas went everywhere. No code was written until 4 pm but
    it already looked like we had implemented everything. Individual projects
    and implementations ideas written in black and orange. Even before writing
    our code, we had a winning idea process.
