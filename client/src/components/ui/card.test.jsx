import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders Card component', () => {
      render(<Card data-testid="card">Card content</Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card')).toHaveTextContent('Card content');
    });

    it('applies custom className to Card', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('rounded-lg', 'border');
    });

    it('forwards ref to Card', () => {
      const ref = { current: null };
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardHeader', () => {
    it('renders CardHeader', () => {
      render(
        <Card>
          <CardHeader data-testid="header">Header content</CardHeader>
        </Card>
      );
      expect(screen.getByTestId('header')).toHaveTextContent('Header content');
    });

    it('applies correct styling to CardHeader', () => {
      render(
        <Card>
          <CardHeader data-testid="header">Header</CardHeader>
        </Card>
      );
      expect(screen.getByTestId('header')).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });
  });

  describe('CardTitle', () => {
    it('renders CardTitle as h3', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
          </CardHeader>
        </Card>
      );
      const title = screen.getByText('Test Title');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('H3');
    });

    it('applies correct styling to CardTitle', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
        </Card>
      );
      const title = screen.getByText('Title');
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });
  });

  describe('CardDescription', () => {
    it('renders CardDescription as paragraph', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Test description</CardDescription>
          </CardHeader>
        </Card>
      );
      const description = screen.getByText('Test description');
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe('P');
    });

    it('applies muted foreground color', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Description</CardDescription>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('Description')).toHaveClass('text-muted-foreground');
    });
  });

  describe('CardContent', () => {
    it('renders CardContent', () => {
      render(
        <Card>
          <CardContent data-testid="content">Content here</CardContent>
        </Card>
      );
      expect(screen.getByTestId('content')).toHaveTextContent('Content here');
    });

    it('applies correct padding', () => {
      render(
        <Card>
          <CardContent data-testid="content">Content</CardContent>
        </Card>
      );
      expect(screen.getByTestId('content')).toHaveClass('p-6', 'pt-0');
    });
  });

  describe('CardFooter', () => {
    it('renders CardFooter', () => {
      render(
        <Card>
          <CardFooter data-testid="footer">Footer content</CardFooter>
        </Card>
      );
      expect(screen.getByTestId('footer')).toHaveTextContent('Footer content');
    });

    it('applies flex layout to CardFooter', () => {
      render(
        <Card>
          <CardFooter data-testid="footer">Footer</CardFooter>
        </Card>
      );
      expect(screen.getByTestId('footer')).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });
  });

  describe('Complete Card Structure', () => {
    it('renders full card with all components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Complete Card</CardTitle>
            <CardDescription>This is a complete card example</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Complete Card')).toBeInTheDocument();
      expect(screen.getByText('This is a complete card example')).toBeInTheDocument();
      expect(screen.getByText('Main content goes here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('maintains proper semantic structure', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      );

      const card = container.firstChild;
      expect(card.querySelector('h3')).toHaveTextContent('Title');
      expect(card.querySelector('.p-6.pt-0')).toHaveTextContent('Content');
    });
  });
});
