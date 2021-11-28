import {
  buildDockerfile,
  buildImage,
  escapeCmd,
} from '@plugins/docker/docker.utils';

describe('docker.utils unit', () => {
  describe('buildImage', () => {
    it("should use version if it's provided", () => {
      const actual = buildImage('node', '16.13.0');
      expect(actual).toEqual('node:16.13.0');
    });

    it('should use default if version if it is not provided', () => {
      const actual = buildImage('node');
      expect(actual).toEqual('node:latest');
    });
  });

  describe('buildDockerfile', () => {
    it('should not include copy if copy is false', () => {
      const [image, cmd] = ['node:16.13.0', 'echo "hello, world!"'];
      const actual = buildDockerfile(image, cmd);

      const expected = `FROM ${image} AS base\nWORKDIR /usr/src/app\nCMD ${escapeCmd(
        cmd
      )}`;
      expect(actual).toEqual(expected);
    });
  });
});
