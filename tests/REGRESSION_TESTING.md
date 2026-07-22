# Proposal workflow regression checks

The workflow regression suite protects the working proposal pipeline while the
saved-draft and editing experience is changed.

## Protected boundaries

`test_workflow_regression_contracts.py` verifies that:

1. normalized grant sections preserve their keys, titles, prompt IDs, prompt
   text, and required flags;
2. the generation request preserves the parsed requirements, supplied profile
   values, and requested budget;
3. saving and loading a proposal does not transform requirements, profile,
   generated draft text, enhanced text, structured answers, prompt coverage,
   validation results, or final sections; and
4. the export request preserves final section content and produces the existing
   question-and-answer export blocks.

The representative payload lives in `fixtures/proposal_workflow.json`. Keep it
small, deterministic, and free of real community or applicant information.

## Run before deployment

From the repository root:

```powershell
python -m pytest -q
Set-Location frontend
npm run build
```

Both commands must pass before merging workflow or editor changes. These tests
must not be updated merely to accommodate an unintended extraction, generation,
or export change; investigate the regression first.
