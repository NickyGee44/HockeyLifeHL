/**
 * Player Registration Components
 *
 * This module exports all components needed for the player registration wizard.
 */

// Container and navigation
export {
  RegistrationWizardContainer,
  RegistrationContext,
  useRegistrationContext,
  type RegistrationWizardContainerProps,
  type RegistrationContextValue,
} from './registration-wizard-container';

export {
  RegistrationWizardNavigation,
  type RegistrationWizardNavigationProps,
} from './registration-wizard-navigation';

export {
  RegistrationWizardProgress,
  type RegistrationWizardProgressProps,
} from './registration-wizard-progress';

// Step components
export { Step1RegistrationType } from './steps/step-1-registration-type';
export { Step2PersonalInfo } from './steps/step-2-personal-info';
export { Step3SkillAssessment } from './steps/step-3-skill-assessment';
export { Step4PhotoUpload } from './steps/step-4-photo-upload';
export { Step5Waiver } from './steps/step-5-waiver';
export { Step6Payment } from './steps/step-6-payment';
export { Step7Confirmation } from './steps/step-7-confirmation';
