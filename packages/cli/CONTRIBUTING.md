<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#contributing-guidelines">Contributing Guidelines</a></li>
    <li><a href="#content">Content</a>
      <ul><a href="#code-of-conduct">Code of Conduct</a></ul>
      <ul><a href="#asking-for-support">Asking for Support</a></ul>
      <ul><a href="#open-issue">Opening an Issue</a></ul>
      <ul><a href="#report-security">Reporting Security Issues</a></ul>
      <ul><a href="#bug-report">Bug Reports and Other Issues</a></ul>
      <ul><a href="#review-doc">Review the documentation</a></ul>
      <ul><a href="#duplicate-issue">Do not open a duplicate issue</a></ul>
      <ul><a href="#use-reactions">Prefer using reactions</a></ul>
      <ul><a href="#use-markdown">Use GitHub-flavored Markdown</a></ul>
      <ul><a href="#feature-request">Feature Requests</a></ul>
      <ul><a href="#feature-request-duplicated">Do not open a duplicate feature request</a></ul>
      <ul><a href="#complete-issue-template">Fully complete the provided issue template</a></ul>
      <ul><a href="#triage-issue">Triaging Issues</a></ul>
    </li>
       <ul><a href="#sub-pr">Submitting Pull Requests</a>
       <ul><a href="#single-pull-request">Smaller is better</a></ul>
       <ul><a href="#coordinate-changes">Coordinate bigger changes</a></ul>
       <ul><a href="#prioritize-understanding">Prioritize understanding over cleverness</a></ul>
       <ul><a href="#coding-style">Follow existing coding style and conventions</a></ul>
       <ul><a href="#test-coverage">Include test coverage</a></ul>
       <ul><a href="#example-project">Update the example project</a></ul>
       <ul><a href="#add-documentation">Add documentation</a></ul>
       <ul><a href="#update-changelog">Update the CHANGELOG</a></ul>
       <ul><a href="#default-branch">Use the repo's default branch</a></ul>
       <ul><a href="#resolve-conflicts">Resolve any merge conflicts</a></ul>
       <ul><a href="#address-ci-failures">Promptly address any CI failures</a></ul>
       <ul><a href="#writing-comments">When writing comments, use properly constructed sentences</a></ul>
       <ul><a href="#use-spaces">Use spaces, not tabs</a></ul>
    </li>
    <li><a href="#writting-commit">Writing Commit Messages</a></li>
    <li><a href="#code-review">Code Review</a></li>
    <li><a href="#coding-style">Coding Style</a></li>
    <li><a href="#cert-ori">Certificate of Origin</a></li>
    <li><a href="#contributing">You are Here</a></li>
  </ol>
</details>

<!-- CONTRIBUTION GUIDELINES -->

# Contributing Guidelines

Pull requests, bug reports, and all other forms of contribution are welcomed and highly encouraged!

> **This guide serves to set clear expectations for everyone involved with the project so that we can improve it together while also creating a welcoming space for everyone to participate. Following these guidelines will help ensure a positive experience for contributors and maintainers.**

# Content

-   **Code of Conduct**: Please review our [Code of Conduct](https://github.com/expressots/expresso-site-doc/blob/main/CODE_OF_CONDUCT.md). It is in effect at all times. We expect it to be honored by everyone who contributes to this project. Acting like an asshole will not be tolerated.

-   **Asking for Support**: See our [Support Guide](https://github.com/expressots/expresso-site-doc/blob/main/SUPPORT.md). In short, GitHub issues are not the appropriate place to debug your specific project, but should be reserved for filing bugs and feature requests.

-   **Opening an Issue**: Before [creating an issue](https://help.github.com/en/github/managing-your-work-on-github/creating-an-issue), check if you are using the latest version of the project. If you are not up-to-date, see if updating fixes your issue first.

-   **Reporting Security Issues**: Review our [Security Policy](https://github.com/expressots/expresso-site-doc/blob/main/SECURITY.md). **Do not** file a public issue for security vulnerabilities.

-   **Bug Reports and Other Issues**: A great way to contribute to the project is to send a detailed issue when you encounter a problem. We always appreciate a well-written, thorough bug report. In short, since you are most likely a developer, **provide a ticket that you would like to receive**.

-   **Review the documentation and [Support Guide](https://github.com/jessesquires/.github/blob/main/SUPPORT.md)** before opening a new issue.

-   **Do not open a duplicate issue!** Search through existing issues to see if your issue has previously been reported. If your issue exists, comment with any additional information you have. You may simply note "I have this problem too", which helps prioritize the most common problems and requests.

-   **Prefer using [reactions](https://github.blog/2016-03-10-add-reactions-to-pull-requests-issues-and-comments/)**, not comments, if you simply want to "+1" an existing issue.

-   **Fully complete the provided issue template.** The bug report template requests all the information we need to quickly and efficiently address your issue. Be clear, concise, and descriptive. Provide as much information as you can, including steps to reproduce, stack traces, compiler errors, library versions, OS versions, and screenshots (if applicable).

-   **Use [GitHub-flavored Markdown](https://help.github.com/en/github/writing-on-github/basic-writing-and-formatting-syntax).** Especially put code blocks and console outputs in backticks (```). This improves readability.

-   **Feature Requests**: Feature requests are welcome! While we will consider all requests, we cannot guarantee your request will be accepted. Your idea may be great, but also out-of-scope for the project. If accepted, we cannot make any commitments regarding the timeline for implementation and release. However, you are welcome to submit a pull request to help!

-   **Do not open a duplicate feature request**: Search for existing feature requests first. If you find your feature (or one very similar) previously requested, comment on that issue.

-   **Fully complete the provided issue template**: The feature request template asks for all necessary information for us to begin a productive conversation. Be precise about the proposed outcome of the feature and how it relates to existing features. Include implementation details if possible.

-   **Triaging Issues**: You can triage issues which may include reproducing bug reports or asking for additional information, such as version numbers or reproduction instructions. Any help you can provide to quickly resolve an issue is very much appreciated!

## Submitting Pull Requests

We **love** pull requests! Before forking the repo and creating a pull request for non-trivial changes, it is usually best to first open an issue to discuss the changes, or discuss your intended approach for solving the problem in the comments for an existing issue.

_Note: All contributions will be licensed under the project's license._

-   **Smaller is better.** Submit **one** pull request per bug fix or feature. A pull request should contain isolated changes pertaining to a single bug fix or feature implementation. **Do not** refactor or reformat code that is unrelated to your change. It is better to **submit many small pull requests** rather than a single large one. Enormous pull requests will take enormous amounts of time to review, or may be rejected altogether.

-   **Coordinate bigger changes.** For large and non-trivial changes, open an issue to discuss a strategy with the maintainers. Otherwise, you risk doing a lot of work for nothing!

-   **Prioritize understanding over cleverness.** Write code clearly and concisely. Remember that source code usually gets written once and read often. Ensure the code is clear to the reader. The purpose and logic should be obvious to a reasonably skilled developer, otherwise you should add a comment that explains it.

-   **Follow existing coding style and conventions.** Keep your code consistent with the style, formatting, and conventions in the rest of the code base. When possible, these will be enforced with a linter. Consistency makes it easier to review and modify in the future.

-   **Include test coverage.** Add unit tests or UI tests when possible. Follow existing patterns for implementing tests.

-   **Update the example project** if one exists to exercise any new functionality you have added.

-   **Add documentation.** Document your changes with code doc comments or in existing guides.

-   **Update the CHANGELOG** for all enhancements and bug fixes. Include the corresponding issue number if one exists, and your GitHub username. (example: "- Fixed crash in profile view. #123 @user")

-   **Use the repo's default branch.** Branch from and submit your pull request to the repo's default branch. Usually this is `main`, but it could be `dev`, `develop`, or `master`.

-   **[Resolve any merge conflicts](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/resolving-a-merge-conflict-on-github)** that occur.

-   **Promptly address any CI failures**. If your pull request fails to build or pass tests, please push another commit to fix it.

-   When writing comments, use properly constructed sentences, including punctuation.

-   Use spaces, not tabs.

## Writing Commit Messages

Please [write a great commit message](https://chris.beams.io/posts/git-commit/).

1. Separate subject from body with a blank line
1. Limit the subject line to 50 characters
1. Capitalize the subject line
1. Do not end the subject line with a period
1. Use the imperative mood in the subject line (example: "Fix networking issue")
1. Wrap the body at about 72 characters
1. Use the body to explain **why**, _not what and how_ (the code shows that!)
1. If applicable, prefix the title with the relevant component name. (examples: "[Docs] Fix typo", "[Profile] Fix missing avatar")

```
[TAG] Short summary of changes in 50 chars or less

Add a more detailed explanation here, if necessary. Possibly give
some background about the issue being fixed, etc. The body of the
commit message can be several paragraphs. Further paragraphs come
after blank lines and please do proper word-wrap.

Wrap it to about 72 characters or so. In some contexts,
the first line is treated as the subject of the commit and the
rest of the text as the body. The blank line separating the summary
from the body is critical (unless you omit the body entirely);
various tools like `log`, `shortlog` and `rebase` can get confused
if you run the two together.

Explain the problem that this commit is solving. Focus on why you
are making this change as opposed to how or what. The code explains
how or what. Reviewers and your future self can read the patch,
but might not understand why a particular solution was implemented.
Are there side effects or other unintuitive consequences of this
change? Here's the place to explain them.

 - Bullet points are okay, too

 - A hyphen or asterisk should be used for the bullet, preceded
   by a single space, with blank lines in between

Note the fixed or relevant GitHub issues at the end:

Resolves: #123
See also: #456, #789
```

## Code Review

-   **Review the code, not the author.** Look for and suggest improvements without disparaging or insulting the author. Provide actionable feedback and explain your reasoning.

-   **You are not your code.** When your code is critiqued, questioned, or constructively criticized, remember that you are not your code. Do not take code review personally.

-   **Always do your best.** No one writes bugs on purpose. Do your best, and learn from your mistakes.

-   Kindly note any violations to the guidelines specified in this document.

## Coding Style

Consistency is the most important. Following the existing style, formatting, and naming conventions of the file you are modifying and of the overall project. Failure to do so will result in a prolonged review process that has to focus on updating the superficial aspects of your code, rather than improving its functionality and performance.

For example, if all private properties are prefixed with an underscore `_`, then new ones you add should be prefixed in the same way. Or, if methods are named using camelcase, like `thisIsMyNewMethod`, then do not diverge from that by writing `this_is_my_new_method`. You get the idea. If in doubt, please ask or search the codebase for something similar.

When possible, style and format will be enforced with a linter.

For more information on Coding Style [click here](https://github.com/rsaz/TypescriptCodingGuidelines)

## :medal_sports: Certificate of Origin

_Developer's Certificate of Origin 1.1_

By making a contribution to this project, I certify that:

> 1. The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or
> 1. The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications, whether created in whole or in part by me, under the same open source license (unless I am permitted to submit under a different license), as indicated in the file; or
> 1. The contribution was provided directly to me by some other person who certified (1), (2) or (3) and I have not modified it.
> 1. I understand and agree that this project and the contribution are public and that a record of the contribution (including all personal information I submit with it, including my sign-off) is maintained indefinitely and may be redistributed consistent with this project or the open source license(s) involved.

## You are Here

If you are reading this, bravo dear user and (hopefully) contributor for making it this far! You are awesome. :100:

To confirm that you have read this guide and are following it as best as possible, **include this emoji at the top** of your issue or pull request: :black_heart: `:black_heart:`
